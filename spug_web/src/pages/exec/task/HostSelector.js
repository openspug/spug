/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Modal, Table, Input, Button, Select } from 'antd';
import { SearchForm } from 'components';
import store from '../../host/store';

@observer
class HostSelector extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedRows: []
    }
  }

  componentDidMount() {
    if (store.records.length === 0) {
      store.fetchRecords()
    }
  }

  handleClick = (record) => {
    const {selectedRows} = this.state;
    const index = selectedRows.indexOf(record);
    if (index > -1) {
      selectedRows.splice(index, 1)
    } else {
      selectedRows.push(record)
    }
    this.setState({selectedRows});
  };

  handleSubmit = () => {
    this.props.onOk(this.state.selectedRows);
    this.props.onCancel()
  };

  columns = [{
    title: '类别',
    dataIndex: 'zone',
  }, {
    title: '主机名称',
    dataIndex: 'name',
    ellipsis: true
  }, {
    title: '连接地址',
    dataIndex: 'hostname',
  }, {
    title: '端口',
    dataIndex: 'port'
  }, {
    title: '备注',
    dataIndex: 'desc',
    ellipsis: true
  }];

  render() {
    const {selectedRows} = this.state;
    let data = store.permRecords;
    if (store.f_name) {
      data = data.filter(item => item['name'].toLowerCase().includes(store.f_name.toLowerCase()))
    }
    if (store.f_zone) {
      data = data.filter(item => item['zone'].toLowerCase().includes(store.f_zone.toLowerCase()))
    }
    const dataIds = data.map(x => x.id);
    return (
      <Modal
        visible
        width={1000}
        title="选择执行主机"
        onCancel={this.props.onCancel}
        onOk={this.handleSubmit}
        maskClosable={false}>
        <SearchForm>
          <SearchForm.Item span={8} title="主机类别">
            <Select allowClear placeholder="请选择" value={store.f_zone} onChange={v => store.f_zone = v}>
              {store.zones.map(item => (
                <Select.Option value={item} key={item}>{item}</Select.Option>
              ))}
            </Select>
          </SearchForm.Item>
          <SearchForm.Item span={8} title="主机别名">
            <Input allowClear value={store.f_name} onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
          </SearchForm.Item>
          <SearchForm.Item span={4} title="已选">
            {selectedRows.length} 台
          </SearchForm.Item>
          <SearchForm.Item span={4}>
            <Button type="primary" icon="sync" onClick={store.fetchRecords}>刷新</Button>
          </SearchForm.Item>
        </SearchForm>
        <Table
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedRows.map(item => item.id),
            onChange: (_, rows) => {
              let tmp = selectedRows.filter(x => !dataIds.includes(x.id))
              this.setState({selectedRows: tmp.concat(rows)})
            }
          }}
          dataSource={data}
          loading={store.isFetching}
          onRow={record => {
            return {
              onClick: () => this.handleClick(record)
            }
          }}
          pagination={false}
          scroll={{y: 480}}
          columns={this.columns}/>
      </Modal>
    )
  }
}

export default HostSelector
