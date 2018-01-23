import React, { Component } from "react";
import { Row, Col } from "reactstrap";
import Header from "../components/Header/Header";
import Sidebar from "../components/Sidebar/Sidebar";
import { Container } from "reactstrap";
import { Switch, Route, Redirect } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb/Breadcrumb";
import Accounts from "../views/Accounts/Accounts";
import Transactions from "../views/Transactions/Transactions";
import Settings from "../views/Settings/Settings";
import { connect } from "react-redux";
import * as actions from "../actions";
import GlobalModal from "../components/GlobalModal/GlobalModal";
import Aside from "../components/Aside/Aside";
import Notifications from "react-notification-system-redux";
import config from "../config";

class App extends Component {
  render() {
    const { notifications } = this.props;
    return (
      <div className="app">
        <Header />
        <div className="app-body">
          <Sidebar {...this.props} />
          <main className="main">
            <Breadcrumb />
            <Container fluid>
              <Switch>
                <Route path="/accounts" component={Accounts} />
                <Route path="/transactions" component={Transactions} />
                <Route path="/settings" component={Settings} />
                <Redirect from="/" to="/dashboard" />
              </Switch>
            </Container>
          </main>
          <Aside />
        </div>
        <GlobalModal />
        <Notifications notifications={notifications} />
        <footer>
          <Row>
            <Col lg="4" sm="4" />
            <Col lg="8" sm="8">
              {config.appbranch}:{config.appcommithash}
            </Col>
          </Row>
        </footer>
      </div>
    );
  }
}

const mapStateToProps = ({ notifications }) => {
  return { notifications };
};

export default connect(mapStateToProps, actions)(App);
