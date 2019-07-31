import React from 'react';
import './components.css'
import {
    allTempMaterials,
    allTempRecipes,
    allTempResource, canInsertModule,
    tempMaterialInfo,
    tempRecipeInfo
} from "./recipe";

function Sprite(props) {
    return <div className="sprite" style={{
        backgroundImage: "url(" + props.atlas + ")",
        width: props.size, height: props.size,
        backgroundPositionX: -props.x * props.size,
        backgroundPositionY: -props.y * props.size
    }}/>;
}

class Icon extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {showTip: false, left: 0, top: 0}
    }

    handleOnMouseOver(event) {
        this.setState({showTip: true});
        this.setTooltipPos(event);
    }

    handleOnMouseOut(event) {
        this.setState({showTip: false});
    }

    handleOnMouseMove(event) {
        this.setTooltipPos(event);
    }

    setTooltipPos(event) {
        this.setState({left: event.clientX + 2, top: event.clientY + 2})
    }

    render() {
        let atlas;
        switch (this.props.value[0]) {
            case 'g':
                atlas = 'group';
                break;
            case 't':
                atlas = 'tech';
                break;
            default:
                atlas = 'small';
        }
        const table = {
            'group': this.props.mapping.group,
            'tech': this.props.mapping.tech,
            'small': this.props.mapping.small
        };
        const size = {'group': 64, 'tech': 128, 'small': 32};
        return (
            <div className={this.props.className + ' icon'} onMouseOver={this.handleOnMouseOver.bind(this)}
                 onMouseOut={this.handleOnMouseOut.bind(this)} onMouseMove={this.handleOnMouseMove.bind(this)}>
                <Sprite atlas={'data/' + atlas + '.png'} size={size[atlas]} x={table[atlas][this.props.value][0]}
                        y={table[atlas][this.props.value][1]}/>
                {this.state.showTip && this.props.tooltip &&
                <div className="tooltip" style={{
                    top: this.state.top,
                    left: this.state.left
                }}>{this.props.tooltip(this.props.tooltipArgs)}</div>}
            </div>
        );
    }
}

function GroupSelect(props) {
    const handleClick = function(event) {
        props.toggleGroup(parseInt(event.currentTarget.getAttribute('name')));
    };

    let groups = [];
    for (const [index, value] of props.groups.entries()) {
        groups.push(<span name={index} key={index} onClick={handleClick}><Icon
            mapping={props.mapping} value={value}
            className={index === props.select ? "group selected" : "group unselected"}
            tooltip={props.tooltip} tooltipArgs={value}/></span>);
    }
    return (
        <div className="group-select">
            {groups}
        </div>
    );
}

function ItemSelect(props) {
    let subgroups = [];
    for (const [index, subgroup] of props.items.entries()) {
        let items = [];
        for (const item of subgroup) {
            if (!props.filter(item.name)) continue;
            const key = item.name + '@' + item.index;
            items.push(<span name={key} key={key} onClick={(event) => {
                props.toggleItem(event.currentTarget.getAttribute('name'))
            }}>
                    <Icon mapping={props.mapping} value={item.name}
                          className={props.select.has(key) ? "item selected" : "item unselected"}
                          tooltip={props.tooltip} tooltipArgs={[item.name, item.index]}/>
                </span>)
        }
        subgroups.push(<div className="item-select-subgroup" key={index}>
            {items}
        </div>)
    }
    return <div className="item-select">
        {subgroups}
    </div>;
}

class Panel extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {group: props.group || 0, keyword: ""}
    }

    handleGroupToggle(group) {
        this.setState({group: group});
    }

    handleItemToggle(item) {
        this.props.toggleItem(item);
    }

    handleKeywordChange(keyword) {
        this.setState({keyword: keyword});
    }

    render() {
        return <div className="panel">
            <SearchBar keyword={this.state.keyword} onChange={this.handleKeywordChange.bind(this)} title={this.props.title}/>
            <GroupSelect mapping={this.props.mapping} groups={this.props.groups} select={this.state.group}
                         toggleGroup={this.handleGroupToggle.bind(this)} tooltip={this.props.groupTooltip}/>
            <ItemSelect mapping={this.props.mapping} items={this.props.items[this.props.groups[this.state.group]]}
                        select={this.props.select} toggleItem={this.handleItemToggle.bind(this)}
                        tooltip={this.props.tooltip} filter={(item) => (this.props.filter(item, this.state.keyword))}/>
            {this.props.onSelectAll && <SelectAllBar onSelectAll={this.props.onSelectAll} onUnselectAll={this.props.onUnselectAll}/>}
        </div>;
    }
}

function RecipeView(props) {
    let ingredients = [];
    for (const [index, ingredient] of props.ingredients.entries()) {
        ingredients.push(<div className="product" key={index}>
            <div className="icon"><Icon mapping={props.mapping} value={ingredient.name}/></div>
            <div className="desc">{ingredient.value}</div>
        </div>);
    }
    let products = [];
    for (const [index, product] of props.products.entries()) {
        products.push(<div className="product" key={index}>
            <div className="icon"><Icon mapping={props.mapping} value={product.name}/></div>
            <div className="desc">{product.value}</div>
        </div>);
    }
    return <div className="recipe-view">
        <div className="title">{props.title}</div>
        <div className="time">
            <div className="icon"><img src="clock-icon.png" alt="Time"/></div>
            <div className="desc">{props.time}</div>
        </div>
        <div className="title">原料</div>
        {ingredients}
        <div className="title">产品</div>
        {products}
    </div>;
}

function TagView(props) {
    return <div className="tag-view">
        <div className="title">{props.title}</div>
    </div>;
}

function ModuleView(props) {
    let effects = [];
    const localised = {consumption: "能耗", speed: "速度", productivity: "产能", pollution: "污染"}
    for (const effect of ["consumption", "speed", "productivity", "pollution"]) {
        const value = props.data.module_attr[props.module].effects[effect];
        if (value !== 0) {
            effects.push(<div className="title" key={effect}>{localised[effect]} {value > 0 && '+'}{(value*100).toFixed(1)}%</div>)
        }
    }
    return <div className="recipe-view">
            <div className="title">{props.data.localised_names[props.module]}</div>
            {effects}
    </div>
}

function MachineView(props) {
    return <div className="recipe-view">
        <div className="title">{props.data.localised_names[props.machine]}</div>
        <div className="title">制造速度 {props.data.machine_attr[props.machine].speed.toFixed(2)}</div>
        <div className="title">插件数量 {props.data.machine_attr[props.machine].module}</div>
    </div>;
}

function SearchBar(props) {
    return <div className="search-bar">
        <div className="title"><div className="title-content"> {props.title}</div></div>
        <div className="search-box">
            <img src="search.png" alt="search" />
            <input className="search-input" value={props.keyword} onChange={(event) => props.onChange(event.target.value)}/>
        </div>
    </div>;
}

function SelectAllBar(props) {
    return <div className="select-all-bar">
        <span onClick={()=>{props.onSelectAll()}}>全选</span>
        <span onClick={()=>{props.onUnselectAll()}}>全不选</span>
    </div>;
}

function MaterialPanel(props) {
    return <Panel mapping={props.data.icon_mapping} groups={props.data.order_info.material_group} title={props.title}
                  items={allTempMaterials(props.data)} select={props.select} toggleItem={props.toggleItem}
                  tooltip={(args) => {
                      const info = tempMaterialInfo(props.data, args[0], args[1]);
                      return <TagView title={info.name}/>;
                  }} groupTooltip={(arg) => (<TagView title={props.data.localised_names[arg]}/>)}
                  filter={(item, keyword) => (keyword === "" || props.data.localised_names[item].includes(keyword) || item.includes(keyword))}
                  onSelectAll={props.onSelectAll} onUnselectAll={props.onUnselectAll}/>
}

function RecipePanel(props) {
    return <Panel mapping={props.data.icon_mapping} groups={props.data.order_info.recipe_group} title={props.title}
                  items={allTempRecipes(props.data)} select={props.select} toggleItem={props.toggleItem}
                  tooltip={(args) => {
                      const info = tempRecipeInfo(props.data, args[0], args[1]);
                      return <RecipeView title={info.name} time={info.time} mapping={props.data.icon_mapping}
                                         ingredients={info.ingredients.map((info) => ({
                                             name: info.icon,
                                             value: info.amount + ' ' + info.name
                                         }))}
                                         products={info.products.map((info) => ({
                                             name: info.icon,
                                             value: info.amount + ' ' + info.name
                                         }))}/>;
                  }} groupTooltip={(arg) => (<TagView title={props.data.localised_names[arg]}/>)}
                  filter={(item, keyword) => (keyword === "" || props.data.localised_names[item].includes(keyword) || item.includes(keyword))}
                  onSelectAll={props.onSelectAll} onUnselectAll={props.onUnselectAll}/>
}

class ResourcePanel extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {keyword: ""}
    }

    render() {
        return <div className="panel">
            <SearchBar keyword={this.state.keyword} onChange={(keyword) => this.setState({keyword: keyword})} title={this.props.title}/>
            <ItemSelect mapping={this.props.data.icon_mapping}
                                                  items={[allTempResource(this.props.data)]}
                                                  select={this.props.select}
                                                  toggleItem={this.props.toggleItem} tooltip={(args) => {
            const info = tempRecipeInfo(this.props.data, args[0], args[1]);
            return <RecipeView title={info.name} time={info.time} mapping={this.props.data.icon_mapping}
                               ingredients={info.ingredients.map((info) => ({
                                   name: info.icon,
                                   value: info.amount + ' ' + info.name
                               }))}
                               products={info.products.map((info) => ({
                                   name: info.icon,
                                   value: info.amount + ' ' + info.name
                               }))}/>;
        }} filter={(item) => (this.state.keyword === "" || this.props.data.localised_names[item].includes(this.state.keyword) || item.includes(this.state.keyword))}/>
            {this.props.onSelectAll && <SelectAllBar onSelectAll={this.props.onSelectAll} onUnselectAll={this.props.onUnselectAll}/>}
        </div>
    }
}

export function SelectPanel(props) {
        const handleToggleItem = function(item) {
            let select = props.select;
            if (props.single) {
                select = item;
            } else {
                if (select.has(item)) {
                    select.delete(item);
                } else {
                    select.add(item);
                }
            }
            props.onChange(select);
        };
        let handleSelectAll, handleUnselectAll;
        if (!props.single) {
            handleUnselectAll = ()=>{props.onChange(new Set())};
            if (props.type === 'material') {
                const materials = allTempMaterials(props.data);
                handleSelectAll = ()=>{props.onChange(
                    new Set(props.data.order_info.material_group.map(group => materials[group]).flat().flat().map(({name, index}) => name+'@'+index))
                )}
            } else if (props.type === 'recipe') {
                const recipes = allTempRecipes(props.data);
                handleSelectAll = ()=>{props.onChange(
                    new Set(props.data.order_info.recipe_group.map(group => recipes[group]).flat().flat().map(({name, index}) => name+'@'+index))
                )}
            } else if (props.type === 'resource') {
                handleSelectAll = ()=>{props.onChange(
                    new Set(allTempResource(props.data).map(({name, index}) => name+'@'+index))
                )}
            }
        }
        let panel;
        const select = props.single ? (props.select ? new Set([props.select]) : new Set()) : props.select;
        if (props.type === 'material')
            panel = <MaterialPanel data={props.data} select={select}
                                  toggleItem={handleToggleItem} title={props.title} onSelectAll={handleSelectAll} onUnselectAll={handleUnselectAll}/>;
        else if (props.type === 'recipe')
            panel = <RecipePanel data={props.data} select={select}
                                toggleItem={handleToggleItem} title={props.title} onSelectAll={handleSelectAll} onUnselectAll={handleUnselectAll}/>;
        else if (props.type === 'resource')
            panel = <ResourcePanel data={props.data} select={select}
                                  toggleItem={handleToggleItem} title={props.title} onSelectAll={handleSelectAll} onUnselectAll={handleUnselectAll}/>;
        else
            panel = null;
    return panel;
}


function RecipeList(props) {
    let recipes = props.recipe.map(({name, index}) =>
        <span key={name + '@' + index}>
            <Icon mapping={props.data.icon_mapping} value={name} className="item non-selectable"
                  tooltip={(args) => {
                      const info = tempRecipeInfo(props.data, args[0], args[1]);
                      return <RecipeView title={info.name} time={info.time} mapping={props.data.icon_mapping}
                                         ingredients={info.ingredients.map((info) => ({
                                             name: info.icon,
                                             value: info.amount + ' ' + info.name
                                         }))}
                                         products={info.products.map((info) => ({
                                             name: info.icon,
                                             value: info.amount + ' ' + info.name
                                         }))}/>;
                  }} tooltipArgs={[name, index]}/></span>);
    return <div>{recipes}</div>;
}

function MachineSelect(props) {
    let machines = props.machine.map((machine) =>
        <span name={machine} key={machine} onClick={props.toggleMachine}>
            <Icon mapping={props.data.icon_mapping} value={machine}
                  className={machine === props.select ? "item selected" : "item unselected"}
                  tooltip={(arg) => <MachineView data={props.data} machine={arg}/>} tooltipArgs={machine}/>
        </span>
    );
    return <div>{machines}</div>;
}

function ModuleSelectMenu(props) {
    let modules = props.module.map((module) =>
        <span key={module} onClick={(event) => {
            props.toggleItem(module)
        }}>
            <Icon mapping={props.data.icon_mapping} value={module} className="item non-selectable"
                  tooltip={(arg) => <ModuleView data={props.data} module={arg}/>}
                  tooltipArgs={module}/>
        </span>
    );
    return <div className="module-select-menu"><img src="slot-icon-module.png" alt="no module" onClick={(event) => {
        props.toggleItem(null)
    }}/>{modules}</div>
}

function ModuleSelect(props) {
    let icon = props.select ?
        <Icon mapping={props.data.icon_mapping} value={props.select} className="item non-selectable"
              tooltip={(arg) => <ModuleView data={props.data} module={arg}/>}
              tooltipArgs={props.select}/> : <img src="slot-icon-module.png" alt="no module"/>;
    return <div className="module-select">{icon}<ModuleSelectMenu data={props.data} module={props.module}
                                                                  toggleItem={(module) => {
                                                                      props.toggleItem(module)
                                                                  }}/></div>
}

export function MachineModuleSelect(props) {
    const machineSelect = props.machineSelect;
    const moduleSelect = props.moduleSelect;
    const beaconModuleSelect = props.beaconModuleSelect;
    const beaconModuleCount = props.beaconModuleCount;

    const handleToggleMachine = function(index, new_machine) {
        const new_module = moduleSelect[index] && canInsertModule(props.data, new_machine, moduleSelect[index]) ? moduleSelect[index] : null;
        const new_beaconModule = beaconModuleSelect[index] && canInsertModule(props.data, new_machine, beaconModuleSelect[index]) ? beaconModuleSelect[index] : null;
        props.onChange({
            machineSelect: machineSelect.map((v, k) => (k === index ? new_machine : v)),
            moduleSelect: moduleSelect.map((v, k) => (k === index ? new_module : v)),
            beaconModuleSelect: beaconModuleSelect.map((v, k) => (k === index ? new_beaconModule : v)),
            beaconModuleCount: beaconModuleCount
        });
    };

    const handleToggleModule = function(index, new_module) {
        props.onChange({
            machineSelect: machineSelect,
            moduleSelect: moduleSelect.map((v, k) => (k === index ? new_module : v)),
            beaconModuleSelect: beaconModuleSelect,
            beaconModuleCount: beaconModuleCount
        });
    };

    const handleToggleBeaconModule = function(index, new_module) {
        props.onChange({
            machineSelect: machineSelect,
            moduleSelect: moduleSelect,
            beaconModuleSelect: beaconModuleSelect.map((v, k) => (k === index ? new_module : v)),
            beaconModuleCount: beaconModuleCount
        });
    };

    const handleChangeBeaconModuleCount = function(index, count) {
        props.onChange({
            machineSelect: machineSelect,
            moduleSelect: moduleSelect,
            beaconModuleSelect: beaconModuleSelect,
            beaconModuleCount: beaconModuleCount.map((v, k) => (k === index ? count : v)),
        });
    };

    const handleToggleAllModule = function(new_module) {
        props.onChange({
            machineSelect: machineSelect,
            moduleSelect: machineSelect.map((machine, index) => (
                !new_module || (props.recipeGroup[index].module.includes(new_module) && canInsertModule(props.data, machine, new_module)) ?
                    new_module : moduleSelect[index])),
            beaconModuleSelect: beaconModuleSelect,
            beaconModuleCount: beaconModuleCount
        });
    };

    const handleToggleAllBeaconModule = function(new_module) {
        props.onChange({
            machineSelect: machineSelect,
            moduleSelect: moduleSelect,
            beaconModuleSelect: machineSelect.map((machine, index) => (
                !new_module || (props.recipeGroup[index].module.includes(new_module) && canInsertModule(props.data, machine, new_module)) ?
                    new_module : beaconModuleSelect[index])),
            beaconModuleCount: beaconModuleCount
        });
    };

    const handleChangeAllBeaconModuleCount = function(count) {
        props.onChange({
            machineSelect: machineSelect,
            moduleSelect: moduleSelect,
            beaconModuleSelect: beaconModuleSelect,
            beaconModuleCount: props.recipeGroup.map((value) => count)
        });
    };

    let lines = [];
    for (const [index, {recipe, machine, module}] of props.recipeGroup.entries()) {
        lines.push(<tr key={index} className="machine-module-select-row">
            <td className="recipe-list-cell"><RecipeList data={props.data} recipe={recipe}/></td>
            <td className="machine-select-cell"><MachineSelect data={props.data} machine={machine}
                                                               select={machineSelect[index]}
                                                               toggleMachine={(event) => {
                                                                   handleToggleMachine(index, event.currentTarget.getAttribute('name'));
                                                               }
                                                               }/></td>
            <td className="module-select-cell"><span className="module-count">{props.data.machine_attr[machineSelect[index]].module}x</span>
                    <ModuleSelect data={props.data} module={module.filter((module) => canInsertModule(props.data, machineSelect[index], module))}
                                                             select={moduleSelect[index]}
                                                             toggleItem={(module) => {
                                                                 handleToggleModule(index, module)
                                                             }
                                                             }/></td>
            <td className="module-select-cell">
                <ModuleSelect data={props.data} module={module.filter((module) => canInsertModule(props.data, machineSelect[index], module))}
                              select={beaconModuleSelect[index]}
                              toggleItem={(module) => {
                                  handleToggleBeaconModule(index, module)
                              }
                              }/>
                <span className="module-count">x</span>
                <input className="module-count-input" value={beaconModuleCount[index]} type="number" onChange={(event) => {
                    handleChangeBeaconModuleCount(index, event.target.value)}
                }/></td>
        </tr>);
    }
    return <div className="machine-module-select"><table>
        <thead><tr>
            <th className="recipe-list-cell"><span className="table-title">配方</span></th>
            <th className="machine-select-cell"><span className="table-title">机器</span></th>
            <th className="module-select-cell"><span className="table-title">插件</span></th>
            <th className="module-select-cell"><span className="table-title">插件分享塔</span></th>
        </tr></thead>
        <tbody>
        {lines}
        <tr>
            <td className="recipe-list-cell"/>
            <td className="machine-select-cell"><span className="module-count">全部</span></td>
            <td className="module-select-cell"><ModuleSelect data={props.data} module={props.data.order_info.module}
                                                             select={null}
                                                             toggleItem={(module) => {
                                                                 handleToggleAllModule(module);
                                                             }
                                                             }/></td>
            <td className="module-select-cell"><ModuleSelect data={props.data} module={props.data.order_info.module}
                                                                                                     select={null}
                                                                                                     toggleItem={(module) => {
                                                                                                         handleToggleAllBeaconModule(module);
                                                                                                     }
                                                                                                     }/><span className="module-count">x</span>
                <input className="module-count-input" type="number" onChange={(event) => {
                    handleChangeAllBeaconModuleCount(event.target.value)}
                }/></td>
        </tr>
        <tr>
            <td className="recipe-list-cell"><RecipeList data={props.data} recipe={props.nonProducible}/></td>
            <td className="machine-select-cell"><span className="module-count">无法制造</span></td>
            <td className="module-select-cell" />
            <td className="module-select-cell" />
        </tr>
        </tbody>
    </table></div>;
}

export function RecipeIOConfig(props) {
    let allowedRecipe = props.config.allowedRecipe || new Set();
    let allowedInput = props.config.allowedInput || new Set();
    let allowedOutput = props.config.allowedOutput || new Set();
    let allowedResource = props.config.allowedResource || new Set();

    return <div className="recipe-io">
        <div><div className="recipe-io-cell"><SelectPanel type='recipe' single={false} data={props.data} select={allowedRecipe} onChange={(allowedRecipe)=>{props.onChange({
            allowedRecipe: allowedRecipe,
            allowedInput: allowedInput,
            allowedOutput: allowedOutput,
            allowedResource: allowedResource
        })}} title="允许使用的配方"/></div>
            <div className="recipe-io-cell"><SelectPanel type='resource' single={false} data={props.data} select={allowedResource} onChange={(allowedResource)=>{props.onChange({
            allowedRecipe: allowedRecipe,
            allowedInput: allowedInput,
            allowedOutput: allowedOutput,
            allowedResource: allowedResource
        })}} title="允许使用的矿"/></div></div>
        <div><div className="recipe-io-cell"><SelectPanel type='material' single={false} data={props.data} select={allowedInput} onChange={(allowedInput)=>{props.onChange({
            allowedRecipe: allowedRecipe,
            allowedInput: allowedInput,
            allowedOutput: allowedOutput,
            allowedResource: allowedResource
        })}} title="允许的输入"/></div>
            <div className="recipe-io-cell"><SelectPanel type='material' single={false} data={props.data} select={allowedOutput} onChange={(allowedOutput)=>{props.onChange({
                allowedRecipe: allowedRecipe,
            allowedInput: allowedInput,
            allowedOutput: allowedOutput,
            allowedResource: allowedResource
        })}} title="允许的输出"/></div></div>
    </div>
}

export function IOConfig(props) {
    let allowedInput = props.config.allowedInput || new Set();
    let allowedOutput = props.config.allowedOutput || new Set();
    let allowedResource = props.config.allowedResource || new Set();

    return <div className="recipe-io">
        <div>
            <div className="recipe-io-cell"><SelectPanel type='resource' single={false} data={props.data} select={allowedResource} onChange={(allowedResource)=>{props.onChange({
                allowedInput: allowedInput,
                allowedOutput: allowedOutput,
                allowedResource: allowedResource
            })}} title="允许使用的矿"/></div>
            <div className="recipe-io-cell"><SelectPanel type='material' single={false} data={props.data} select={allowedInput} onChange={(allowedInput)=>{props.onChange({
            allowedInput: allowedInput,
            allowedOutput: allowedOutput,
            allowedResource: allowedResource
        })}} title="可用的输入"/></div>
            <div className="recipe-io-cell"><SelectPanel type='material' single={false} data={props.data} select={allowedOutput} onChange={(allowedOutput)=>{props.onChange({
                allowedInput: allowedInput,
                allowedOutput: allowedOutput,
                allowedResource: allowedResource
            })}} title="允许的额外输出"/></div></div>
    </div>
}

function ItemChoice(props) {
    let icon = null;
    if (props.select) {
        const [name, index] = props.select.split('@');
        icon = <Icon mapping={props.data.icon_mapping} value={name} className="item non-selectable"
                         tooltip={(args) => {
                             const info = tempMaterialInfo(props.data, args[0], args[1]);
                             return <TagView title={info.name}/>;
                         }}
                         tooltipArgs={[name, index]}/>;
    } else {
        icon = <div className="icon item non-selectable"><img src="no-recipe.png" alt="no recipe" height="32px" width="32px" style={{margin: "auto"}}/></div>;
    }
    return <div className="item-choice">
        {icon}
        <SelectPanel type='material' single={true} data={props.data} select={props.select} onChange={(select) => {props.onChange(select)}}
    /></div>
}

export function TargetConfig(props) {
    if (props.config.length === 0) props.onChange([{item: null, amount: 0}]);
    let targets = [];
    for (const [index, {item, amount}] of props.config.entries()) {
        targets.push(<tr key={index}>
            <td><div className="target-add" onClick={()=>{props.onChange(props.config.filter((value, i) => (i !== index)))}}>x</div></td>
            <td><ItemChoice data={props.data} select={item} onChange={(item)=>{
                props.onChange(props.config.map((value, i) => (
                    i === index ? {item: item, amount: value.amount} : value
                )))}}/></td>
            <td className="target-amount"><input className="target-amount" type="number" value={amount} onChange={(event)=>{
                props.onChange(props.config.map((value, i) => (
                    i === index ? {item: value.item, amount: event.target.value} : value
                )))
            }}/>个每分钟</td>
        </tr>)
    }
    return <table className="target"><tbody>
        {targets}
        <tr><td><div className="target-add" onClick={()=>{props.onChange(props.config.concat([{
            item: null, amount: 0
        }]))}}>+</div></td></tr>
    </tbody></table>
}


export function ResultList(props) {
    let lines = [];
    for (const [index, {name, amount, machine, module, beaconModule, beaconModuleCount}] of props.result.entries()) {
        lines.push(<tr key={index} className="machine-module-select-row">
            <td className="recipe-list-cell"><RecipeList data={props.data} recipe={[{name: name.split('@')[0], index: parseInt(name.split('@')[1])}]}/></td>
            <td className="machine-select-cell"><span className="module-count">{amount.toFixed(2)}x</span><Icon mapping={props.data.icon_mapping} value={machine} className="item non-selectable"
                                                      tooltip={(arg) => <MachineView data={props.data} machine={arg}/>}
                                                      tooltipArgs={machine}/></td>
            <td className="module-select-cell">{module && <span className="module-count">{props.data.machine_attr[machine].module}x</span>}
                {module && <Icon mapping={props.data.icon_mapping} value={module} className="item non-selectable"
                      tooltip={(arg) => <ModuleView data={props.data} module={arg}/>}
                      tooltipArgs={module}/>}</td>
            <td className="module-select-cell">
                {beaconModule && <span className="module-count">{beaconModuleCount}x</span>}
                {beaconModule && <Icon mapping={props.data.icon_mapping} value={beaconModule} className="item non-selectable"
                                 tooltip={(arg) => <ModuleView data={props.data} module={arg}/>}
                                 tooltipArgs={beaconModule}/>}</td>
        </tr>);
    }
    let items = [];
    let itemBalance = {};
    for (const {amount, balance} of props.result) {
        for (const [item, value] of Object.entries(balance)) {
            itemBalance[item] = (itemBalance[item] || 0) + value * amount;
        }
    }
    const maxAmount = Math.max(...Object.entries(itemBalance).map(([k, v]) => Math.abs(v)));
    for (const [item, amount] of Object.entries(itemBalance)) {
        if (Math.abs(amount) / maxAmount < 1e-12 || item.startsWith('resource')) continue;
        items.push(<tr key={item} className="machine-module-select-row">
            <td className="recipe-list-cell"><Icon mapping={props.data.icon_mapping} value={item.split('@')[0]}
                                                   className="item non-selectable"
                                                   tooltip={(args) => {
                                                       const info = tempMaterialInfo(props.data, args[0], args[1]);
                                                       return <TagView title={info.name}/>;
                                                   }} tooltipArgs={item.split('@')}/></td>
            <td className="machine-select-cell"><span className="module-count">{amount.toPrecision(3)}</span></td>
        </tr>);
    }
    return <div className="machine-module-select" style={{width: "100%"}}><table style={{width: "100%"}}>
        <thead><tr>
            <th className="recipe-list-cell"><span className="table-title">配方</span></th>
            <th className="machine-select-cell"><span className="table-title">机器</span></th>
            <th className="module-select-cell"><span className="table-title">插件</span></th>
            <th className="module-select-cell"><span className="table-title">插件分享塔</span></th>
        </tr></thead>
        <tbody>
        {lines}
        </tbody>
    </table>
        <table style={{width: "100%"}}>
            <thead><tr>
                <th className="recipe-list-cell"><span className="table-title">物品</span></th>
                <th className="machine-select-cell"><span className="table-title">每分钟产量</span></th>
            </tr></thead>
            <tbody>
            {items}
            </tbody>
        </table>
    </div>;
}