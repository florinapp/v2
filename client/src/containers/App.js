import React, { Component } from 'react';
import Header from '../components/Header/Header';
import Sidebar from '../components/Sidebar/Sidebar';
import { Container } from 'reactstrap';
import { Switch, Route, Redirect } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb/Breadcrumb';
import Accounts from '../views/Accounts/Accounts';

class App extends Component {
  render() {
    return <div className="app">
        <Header />
        <div className="app-body">
          <Sidebar {...this.props} />
          <main className="main">
            <Breadcrumb />
            <Container fluid>
              <Switch>
                <Route path="/accounts" name="Accounts" component={Accounts} />
                {/* <Route path="/dashboard" name="Dashboard" component={} /> */}
                <Redirect from="/" to="/dashboard" />
              </Switch>
            </Container>
          </main>
        </div>
      </div>;
  }
}

export default App;