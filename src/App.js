import React from 'react';
import './App.css';
import {DataForm} from './page'

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {data: null, isLoadingData: true};
        fetch('data/info.json')
            .then(response => response.json())
            .then(data => {
                this.setState({data: data, isLoadingData: false});
            })
    }

    render() {
        if (this.state.isLoadingData) {
            return (
                <div className="App">
                    Loading
                </div>
            );
        } else {
            return (
                <div className="App">
                    <DataForm data={this.state.data} />
                </div>
            );
        }
    }
}

export default App;
