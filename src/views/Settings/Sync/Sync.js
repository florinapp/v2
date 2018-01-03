import React, { Component } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Row,
  Col,
  Alert,
  Table
} from "reactstrap";
import { Field, reduxForm } from "redux-form";
import InputField from "../../../components/InputField/InputField";
import db from "../../../db";
import { connect } from "react-redux";
import * as actions from "../../../actions";
import * as vu from "valid-url";
import Sync from "../../../models/Sync";

const sync = () => {
  db
    .sync("http://admin:password@localhost:5984/florin", {
      live: true,
      retry: true
    })
    .on("change", info => {
      console.log(info);
    })
    .on("paused", err => {
      console.log(err);
    })
    .on("active", () => {})
    .on("denied", err => {
      console.log(err);
    })
    .on("complete", info => {
      console.log(info);
    })
    .on("error", err => {
      console.log(err);
    });
};

const required = value => (value ? undefined : "This field is required");

const validUrl = value =>
  vu.isWebUri(value) ? undefined : "Must be a valid url";

let SyncSetupForm = ({ handleSubmit, onSubmit }) => {
  return (
    <form className="form-horizontal" onSubmit={handleSubmit(onSubmit)}>
      <Field
        name="remote"
        label="Target address"
        component={InputField}
        otherProps={{
          placeholder: "e.g., http://admin:password@localhost:5984/florin"
        }}
        validate={[validUrl]}
      />
      <Button type="submit" color="success">
        Start Sync!
      </Button>
    </form>
  );
};

SyncSetupForm = reduxForm({ form: "syncSetup" })(SyncSetupForm);

class SyncView extends Component {
  componentDidMount() {
    this.props.fetchSyncs();
  }

  render() {
    const syncsState = this.props.syncs;
    const { syncs } = syncsState;
    const { createSync } = this.props;
    return (
      <Row>
        <Col xs="12" lg="12">
          <Card>
            <CardHeader>
              <strong>Add New Sync</strong>
            </CardHeader>
            <CardBody>
              <SyncSetupForm onSubmit={props => createSync(new Sync(props))} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <strong>Current Syncs</strong>
            </CardHeader>
            <CardBody>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Remote URL</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {syncs.map(sync => {
                    return (
                      <tr key={sync.remote}>
                        <td>{sync.remote}</td>
                        <td />
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>
      </Row>
    );
  }
}

const mapStateToProps = ({ syncs }) => {
  return { syncs };
};

export default connect(mapStateToProps, actions)(SyncView);
