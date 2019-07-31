import {allTempMaterials} from "./recipe";
import * as glpk from "hgourvest-glpk"

function recipeBalance(data, config) {
    let ret = {};
    const recipeGroup = config.machineConfig.recipeGroup;
    for (const [index, group] of recipeGroup.entries()) {
        for (const recipe of group.recipe) {
            const recipeName = recipe.name + '@' + recipe.index;
            const recipeAttr = data.recipe_attr[recipe.name];
            const recipeTime = recipeAttr.time;
            let recipeBalance = {};
            for (let [name, amount] of recipeAttr.ingredients[recipe.index]) {
                if (!name.includes("@")) name = name +"@0";
                recipeBalance[name] = (recipeBalance[name] || 0) - amount;
            }
            for (let [name, amount] of recipeAttr.products) {
                if (!name.includes("@")) name = name +"@0";
                recipeBalance[name] = (recipeBalance[name] || 0) + amount;
            }
            const machine = config.machineConfig.machineSelect[index];
            const module = config.machineConfig.moduleSelect[index];
            const beaconModule = config.machineConfig.beaconModuleSelect[index];
            const beaconModuleCount = config.machineConfig.beaconModuleCount[index];
            const machineTime = recipeTime / data.machine_attr[machine].speed;
            let speedEff = 1, prodEff = 1+data.machine_attr[machine].base_prod;
            if (recipeName.startsWith('resource')) prodEff += config.targetConfig.productivity / 100;
            if (module) {
                speedEff += data.module_attr[module].effects.speed * data.machine_attr[machine].module;
                prodEff += data.module_attr[module].effects.productivity * data.machine_attr[machine].module;
            }
            if (beaconModule) {
                speedEff += data.module_attr[beaconModule].effects.speed * beaconModuleCount;
                prodEff += data.module_attr[beaconModule].effects.productivity * beaconModuleCount;
            }
            const moduleTime = machineTime / speedEff;
            const moduleBalance = Object.fromEntries(Object.entries(recipeBalance).map(([key, value]) => ([key, value > 0 ? value * prodEff : value])));
            const finalBalance = Object.fromEntries(Object.entries(moduleBalance).map(([key, value]) => ([key, value / moduleTime * 60])));
            ret[recipeName] = {machine: machine, module: module, beaconModule: beaconModule, beaconModuleCount: beaconModuleCount, balance: finalBalance};
        }
    }
    return ret;
}

function productionLineRecipes(data, config, recipeBalance) {
    let ret = {};
    for (const [index, line] of config.productionLineConfig.entries()) {
        const allowedRecipe = [...line.allowedRecipe, ...line.allowedResource].filter((recipe) => (recipe.startsWith('recipe') || config.targetConfig.IO.allowedResource.has(recipe)));
        for (const recipe of allowedRecipe) {
            if (recipeBalance[recipe] === undefined) continue;
            ret['L' + index+'#'+recipe] = {
                ...recipeBalance[recipe].balance,
                ...Object.fromEntries(Object.entries(recipeBalance[recipe].balance).map(([k, v]) => ['L'+index+'#'+k, v]))
            };
        }
    }
    return ret;
}

function productionLineConstraints(data, config) {
    let ret = {};
    const materials = allTempMaterials(data);
    const allMaterials = data.order_info.material_group.map(group => materials[group]).flat().flat().map(({name, index}) => name+'@'+index);
    for (const [index, line] of config.productionLineConfig.entries()) {
        for (const material of allMaterials) {
            const allowInput = line.allowedInput.has(material);
            const allowOutput = line.allowedOutput.has(material);
            if (!allowInput || !allowOutput) {
                let spec= {};
                if (!allowInput) spec["min"] = 0;
                if (!allowOutput) spec["max"] = 0;
                ret["L"+index+"#"+material] = spec;
            }
        }
    }
    return ret;
}

function targetConstraints(data, config) {
    let ret = {};
    let target = {};
    for (const {item, amount} of config.targetConfig.target) {
        if (!item) continue;
        target[item] = (target[item] || 0) + parseFloat(amount);
    }
    const materials = allTempMaterials(data);
    const allMaterials = data.order_info.material_group.map(group => materials[group]).flat().flat().map(({name, index}) => name+'@'+index);
    for (const material of allMaterials) {
        const allowInput = config.targetConfig.IO.allowedInput.has(material);
        const allowOutput = config.targetConfig.IO.allowedOutput.has(material);
        if (!allowInput || !allowOutput) {
            let spec= {};
            if (!allowInput) spec["min"] = target[material] || 0;
            if (!allowOutput) spec["max"] = target[material] || 0;
            ret[material] = spec;
        }
    }
    return ret;
}

function resolveLine(data, config, result) {
    const recipeMachine = recipeBalance(data, config);
    let ret = config.productionLineConfig.map(() => []);
    for (const [k, v] of Object.entries(result)) {
        const [line_, recipe] = k.split('#');
        const line = parseInt(line_.substr(1));
        ret[line].push({name: recipe, amount: v, ...recipeMachine[recipe]});
    }
    return ret;
}

export function solve(data, config) {
    const recipeBalance_ = recipeBalance(data, config);
    const productionLineRecipes_ = productionLineRecipes(data, config, recipeBalance_);
    const productionLineConstraints_ = productionLineConstraints(data, config);
    const targetConstraints_ = targetConstraints(data, config);
    const constraints = {
        ...productionLineConstraints_, ...targetConstraints_
    };
    const variables = productionLineRecipes_;
    let variablesTrans = {};
    for (const [recipe, c] of Object.entries(variables)) {
        for (const [cons, v] of Object.entries(c)) {
            variablesTrans[cons] = variablesTrans[cons] || {};
            variablesTrans[cons][recipe] = v;
        }
    }

    const normalize = (name) => (name.replace(/-/g, "$"));

    let prob = "Minimize\nobj: + 0 dummy\nSubject to\n";
    for (const [cons, range] of Object.entries(constraints)) {
        if (!variablesTrans[cons]) {
            if (range.min || range.max) {
                return resolveLine(data, config, {});
            }else {
                continue;
            }
        }
        const expr = Object.entries(variablesTrans[cons]).map(([k, v]) => (v<0?"- "+(-v):"+ "+v)+" "+normalize(k)).join(" ");
        const relation = (range.min === undefined) ? ' <= '+range.max :
            (range.max === undefined) ? ' >= '+range.min : " = "+range.max; // assumption: if min and max both occurs, they are equal
        prob += normalize(cons) + " : " + expr + relation + '\n';
    }
    prob += 'End';

    glpk.glp_set_print_func(console.log);
    let lp = glpk.glp_create_prob();
    glpk.glp_read_lp_from_string(lp, null, prob);
    glpk.glp_scale_prob(lp, glpk.GLP_SF_AUTO);
    let smcp = new glpk.SMCP({presolve: glpk.GLP_ON});
    glpk.glp_simplex(lp, smcp);
    if (glpk.glp_get_status(lp) !== glpk.GLP_OPT) {
        glpk.glp_delete_index(lp);
        return resolveLine(data, config, {});
    }

    let result = {};
    let i;
    for(i = 1; i <= glpk.glp_get_num_cols(lp); i++){
        if (glpk.glp_get_col_prim(lp, i))
            result[glpk.glp_get_col_name(lp, i)] = glpk.glp_get_col_prim(lp, i);
    }
    const max = Math.max(...Object.entries(result).map(([k, v]) => v));
    result = Object.fromEntries(Object.entries(result).filter(([k, v]) => Math.abs(v)/max > 1e-9));
    result = Object.fromEntries(Object.entries(result).map(([k, v]) => [k.replace(/\$/g, "-"), v]));
    glpk.glp_delete_index(lp);
    return resolveLine(data, config, result);
}