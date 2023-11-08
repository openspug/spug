/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, {useEffect, useState} from 'react';
import {Input, Table} from 'antd';
import {TableCard} from 'components';
import {observer} from "mobx-react";
import {http} from "../../libs";

export default observer(function PortsTable(value) {
    let [portFetching, setPortFetching] = useState(false)
    let [dataSource, setDataSource] = useState([])
    let [searchText, setSearchText] = useState(''); // 新增搜索文本状态

    useEffect(() => {
        fetchPorts(value.host_id)
    }, [])

    function fetchPorts() {
        console.log("host_id:" + value.host_id, "portFetching:" + portFetching)
        setPortFetching(true);
        return http.post('/api/host/ports/', {
            'host_id': value.host_id
        })
            .then(res => {
                setDataSource(res)
            })
            .finally(() => setPortFetching(false))
    }

    function handleSearch(value) {
        setSearchText(value);
    }

    const filteredDataSource = dataSource.filter(item =>
        item.listen.toLowerCase().includes(searchText.toLowerCase()) ||
        item.pid.toLowerCase().includes(searchText.toLowerCase())
    );

    return (<TableCard
        tKey="mi"
        rowKey="id"
        title={<Input.Search allowClear value={searchText} placeholder="输入端口/PID检索" style={{maxWidth: 250}}
                             onChange={e => handleSearch(e.target.value)}/>}
        loading={portFetching}
        dataSource={filteredDataSource}
        onReload={fetchPorts}
        pagination={{
            showSizeChanger: true,
            showLessItems: true,
            showTotal: total => `共 ${total} 条`,
            defaultPageSize: 50,
            pageSizeOptions: ['50', '100']
        }}
        scroll={{
            y: 240,
        }}
    >
        <Table.Column title="协议" dataIndex="protocol"/>
        <Table.Column title="监听地址" dataIndex="listen"/>
        <Table.Column title="连接数" dataIndex="connections"
                      sorter={(a, b) => a.connections.localeCompare(b.connections)}
                      sortDirections={['descend']}
                      defaultSortOrder="descend"
        />
        <Table.Column title="PID/进程名" dataIndex="pid"
        />
    </TableCard>)
})