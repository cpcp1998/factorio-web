export function allTempRecipes(data) {
    const recipes = data.order_info.recipe;
    const groups = data.order_info.recipe_group;
    const unlockable = data.unlockable_recipes;
    let ret = {};
    for (const group of groups) {
        ret[group] = recipes[group].map((subgroup) => (subgroup.filter((recipe) => unlockable.includes(recipe))));
        ret[group] = ret[group].filter((subgroup) => subgroup.length);
    }
    for (const group of groups) {
        ret[group] = ret[group].map((subgroup) =>
            (subgroup.filter((recipe) => (data.recipe_attr[recipe])).map((recipe) =>
                    (Array.from(data.recipe_attr[recipe].ingredients.keys()).map((i) =>
                        ({"name": recipe, "index": i}))
                    )).flat()
            ))
    }
    return ret;
}

export function allTempMaterials(data) {
    const materials = data.order_info.material;
    const groups = data.order_info.material_group;
    let ret = {};
    for (const group of groups) {
        ret[group] = materials[group].map((subgroup) =>
            (subgroup.map((material) =>
                (Array.from((data.temperature_attr[material] || [0]).keys()).map((i) =>
                        ({"name": material, "index": i}))
                )).flat()
            ))
    }
    return ret;
}

export function allTempResource(data) {
    return data.order_info.resource.map((recipe) =>
        (Array.from(data.recipe_attr[recipe].ingredients.keys()).map((i) =>
            ({"name": recipe, "index": i}))
        )).flat()
}

export function tempMaterialInfo(data, material, id) {
    let ret = {};
    let name = data.localised_names[material];
    if (data.temperature_attr[material]) {
        const temp_info = data.temperature_attr[material][id];
        name += '(' + temp_info.join(',') + '℃)';
    }
    ret['name'] = name;
    return ret;
}

export function tempRecipeInfo(data, recipe, id) {
    const recipeConvert = ([name, amount]) => {
        const materal = name.split('@')[0];
        const m_id = name.includes('@') ? name.split('@')[1] : 0;
        const localised = tempMaterialInfo(data, materal, m_id)['name'];
        return {name: localised, amount: amount, icon: materal};
    };
    let ret = {};
    ret['name'] = data.localised_names[recipe];
    let attr = data.recipe_attr[recipe];
    ret['time'] = attr.time;
    ret['category'] = attr.category;
    ret['ingredients'] = attr.ingredients[id].map(recipeConvert);
    ret['products'] = attr.products.map(recipeConvert);
    return ret;
}

export function canProduce(data, recipe, machine) {
    recipe = recipe.split('@')[0];
    recipe = data.recipe_attr[recipe];
    if (!data.order_info.machine[recipe.category].includes(machine)) return false;
    machine = data.machine_attr[machine];
    if (machine.fixed !== "") return machine.fixed === recipe.name;
    if (machine.in >= 0 && recipe.ingredients[0].filter(([name, value]) => (name.startsWith('item'))).length > machine.in) return false;
    if (machine.in_fluid >= 0 && recipe.ingredients[0].filter(([name, value]) => (name.startsWith('fluid') && value > 0)).length > machine.in_fluid) return false;
    if (machine.out_fluid >= 0 && recipe.products.filter(([name, value]) => (name.startsWith('fluid') && value > 0)).length > machine.out_fluid) return false;
    return true;
}

export function splitRecipeByMachine(data, recipes, machines) {
    let ret = [{recipe: recipes, machine: []}];
    for (const machine of machines)
        ret = ret.map((value) => {
            const can = value.recipe.filter((recipe) => (canProduce(data, recipe.name, machine)));
            const cannot = value.recipe.filter((recipe) => (!can.includes(recipe)));
            let pairs = [];
            if (can.length) {
                pairs.push({recipe: can, machine: value.machine.concat([machine])})
            }
            if (cannot.length) {
                pairs.push({recipe: cannot, machine: value.machine})
            }
            return pairs;
        }).flat();
    return ret;
}

export function splitRecipeByModule(data, recipes) {
    let ret = [{recipe: recipes, module: []}];
    for (const module of data.order_info.module) {
        const limit = data.module_attr[module].limitation;
        if (!limit.length) {
            ret.forEach((value) => { value.module.push(module)});
        } else {
            ret = ret.map((value) => {
                const can = value.recipe.filter((recipe) => limit.includes(recipe.name));
                const cannot = value.recipe.filter((recipe) => (!can.includes(recipe)));
                let pairs = [];
                if (can.length) {
                    pairs.push({recipe: can, module: value.module.concat([module])})
                }
                if (cannot.length) {
                    pairs.push({recipe: cannot, module: value.module})
                }
                return pairs;
            }).flat();
        }
    }
    return ret;
}

export function cleanRecipeMachinePair(pair) {
    return pair.filter((value) => (value.machine && value.machine.length));
}

export function getRecipeGroup(data) {
    let recipes = allTempRecipes(data);
    recipes = data.order_info.recipe_group.map((group) => (recipes[group])).flat().flat();
    recipes = recipes.concat(allTempResource(data));
    let recipeByCat = new Map();
    recipes.forEach((recipe) => {
        const category = data.recipe_attr[recipe.name].category;
        recipeByCat.get(category) ? recipeByCat.get(category).push(recipe) : recipeByCat.set(category, [recipe])
    });
    let recipeMachinePair = Array.from(recipeByCat.keys()).map((category) => ({recipe: recipeByCat.get(category),machine: data.order_info.machine[category]}));
    recipeMachinePair = cleanRecipeMachinePair(recipeMachinePair);
    recipeMachinePair = recipeMachinePair.map((pair) => (splitRecipeByMachine(data, pair.recipe, pair.machine))).flat();
    recipeMachinePair = cleanRecipeMachinePair(recipeMachinePair);
    recipeMachinePair = recipeMachinePair.map((pair) => (splitRecipeByModule(data, pair.recipe).map((value) => ({recipe: value.recipe, module: value.module, machine: pair.machine})))).flat();
    let nonProducible = recipes.filter((recipe) => {
        for (const value of recipeMachinePair) {
            if (value.recipe.includes(recipe)) return false;
        }
        return true;
    });
    return {recipeGroup: recipeMachinePair, nonProducible: nonProducible};
}

export function canInsertModule(data, machine, module) {
    if (module === null) return true;
    machine = data.machine_attr[machine];
    module = data.module_attr[module];
    for (const effect of ["consumption", "speed", "productivity", "pollution"]) {
        if (!machine.effects.includes(effect) && module.effects[effect]) return false;
    }
    return true;

}