import React from 'react'
import './page.css'
import {MachineModuleSelect, RecipeIOConfig, TargetConfig, IOConfig, ResultList} from './components'
import {allTempMaterials, allTempRecipes, allTempResource, getRecipeGroup} from "./recipe";
import {solve} from "./algorithm";

function defaultTargetPage(data) {
    const materials = allTempMaterials(data);
    return {productivity: 0, target: [], IO: {
            allowedResource: new Set(allTempResource(data).map(({name, index}) => name+'@'+index)),
            allowedOutput: new Set(),
            allowedInput: new Set(data.order_info.material_group.map(group => materials[group]).flat().flat()
                .filter(({name}) => data.free_fluids.includes(name)).map(({name, index}) => name+'@'+index))
        }};
}

function TargetPage(props) {
    let config = props.config;
    return <div className="target-page">
        <div className="productivity">采矿产能<input type="number" value={config.productivity} onChange={(event) =>
            props.onChange(Object.assign(Object.assign({}, config), {productivity: event.target.value}))} />%</div>
        <div className="target-config"><div className="title">生产目标</div><TargetConfig data={props.data} config={config.target} onChange={(target) =>
            props.onChange(Object.assign(Object.assign({}, config), {target: target}))}/></div>
        <IOConfig data={props.data} config={config.IO} onChange={(IO) =>
            props.onChange(Object.assign(Object.assign({}, config), {IO: IO}))}/>
    </div>
}

function defaultMachinePage(data) {
    const {recipeGroup, nonProducible} = getRecipeGroup(data);
    const machineSelect = recipeGroup.map((value) => (value.machine[0]));
    const moduleSelect = recipeGroup.map((value) => null);
    const beaconModuleSelect =  recipeGroup.map((value) => null);
    const beaconModuleCount = recipeGroup.map((value) => 0);
    return {recipeGroup: recipeGroup, nonProducible: nonProducible, machineSelect: machineSelect,
        moduleSelect: moduleSelect, beaconModuleSelect: beaconModuleSelect, beaconModuleCount:beaconModuleCount };
}

function MachinePage(props) {
    let config = props.config;
    return <MachineModuleSelect data={props.data} recipeGroup={config.recipeGroup} nonProducible={config.nonProducible}
                                onChange={(state) => {props.onChange({...state, recipeGroup: config.recipeGroup, nonProducible: config.nonProducible})}}
                                machineSelect={config.machineSelect} moduleSelect={config.moduleSelect}
                                beaconModuleSelect={config.beaconModuleSelect} beaconModuleCount={config.beaconModuleCount}
    />
}

function defaultProductionLine(data) {
    const recipes = allTempRecipes(data);
    const materials = allTempMaterials(data);
    return {
        allowedRecipe: new Set(data.order_info.recipe_group.map(group => recipes[group]).flat().flat().map(({name, index}) => name+'@'+index)),
        allowedResource: new Set(allTempResource(data).map(({name, index}) => name+'@'+index)),
        allowedOutput: new Set(data.order_info.material_group.map(group => materials[group]).flat().flat().map(({name, index}) => name+'@'+index)),
        allowedInput: new Set(data.order_info.material_group.map(group => materials[group]).flat().flat().map(({name, index}) => name+'@'+index))
    };
}

function ProductionLine(props) {
    const config = props.config;
    return <div className="target-page">
        <RecipeIOConfig data={props.data} config={config} onChange={(config) =>
            props.onChange(config)}/>
    </div>
}

function defaultProductionLinePage(data) {
    return [defaultProductionLine(data)];
}

class ProductionLinePage extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {page: 0};
    }

    render() {
        let config = this.props.config || [defaultProductionLine(this.props.data)];
        const tags = config.map((value, index) => (
            <div key={index} className={index === this.state.page ? "tag active" : "tag"}>
                <div className="title" onClick={() => this.setState({page: index})}>生产线{index+1}</div>
                <div className="delete" onClick={() => {
                    let new_config = config.filter((value, i) => (i !== index));
                    if (new_config.length === 0) new_config = [defaultProductionLine(this.props.data)];
                    this.setState(({page}) => ({page: page >= index ? Math.max(0, page-1) : page}) );
                    this.props.onChange(new_config);
                }}>x</div>
            </div>
        ));
        let page = this.state.page;
        return <div>
            <div className="tag-list">
                {tags}
                <div key="add" className="tag">
                    <div className="delete" onClick={() => this.props.onChange(config.concat([defaultProductionLine(this.props.data)]))}>+</div>
                </div>
            </div>
            <ProductionLine data={this.props.data} config={config[page]} onChange={(value) => this.props.onChange(
                config.map((v, i) => (i === page ? value : v))
            )}/>
        </div>;
    }
}


class ResultPage extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {page: 0};
    }

    render() {
        const result = solve(this.props.data, this.props.config);
        const tags = result.map((value, index) => (
            <div key={index} className={index === this.state.page ? "tag active" : "tag"}>
                <div className="title" onClick={() => this.setState({page: index})}>生产线{index+1}</div>
            </div>
        ));
        let page = this.state.page;
        return <div>
            <div className="tag-list">
                {tags}
            </div>
            <ResultList data={this.props.data} result={result[page]}/>
        </div>;
    }
}

export class DataForm extends React.Component {
    static defaultState(data) {
        return {
            page: "target",
            targetConfig: defaultTargetPage(data),
            machineConfig: defaultMachinePage(data),
            productionLineConfig: defaultProductionLinePage(data)
        }
    }

    constructor(props) {
        super(props);
        this.state = DataForm.defaultState(props.data);
    }

    render() {
        const name = {target:"生产目标", machine: "工厂插件设置", productionLine: "生产线设置", result: "计算结果"};
        const tabs = ["target", "machine", "productionLine", "result"].map((tab) => (
            <div key={tab} className={tab === this.state.page ? "tag big active" : "tag big"}>
                <div className="title" onClick={() => this.setState({page: tab})}>{name[tab]}</div>
            </div>
        ));
        let page;
        switch(this.state.page) {
            case "target":
                page = <TargetPage data={this.props.data} config={this.state.targetConfig} onChange={(config) => this.setState({targetConfig: config})}/>;
                break;
            case "machine":
                page = <MachinePage data={this.props.data} config={this.state.machineConfig} onChange={(config) => this.setState({machineConfig: config})}/>;
                break;
            case "productionLine":
                page = <ProductionLinePage data={this.props.data} config={this.state.productionLineConfig} onChange={(config) => this.setState({productionLineConfig: config})}/>;
                break;
            case "result":
                page = <ResultPage data={this.props.data} config={this.state}/>;
                break;
            default:
                page = null;
        }
        return <div className="data-form">
            <div className="tag-list">
                {tabs}
                <div className="page-container"> {page}</div>
            </div>
        </div>
    }
}