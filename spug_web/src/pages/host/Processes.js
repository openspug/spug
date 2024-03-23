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

export default observer(function ProcessesTable(value) {
    let [processFetching, setProcessFetching] = useState(false)
    let [dataSource, setDataSource] = useState([])
    let [searchText, setSearchText] = useState(''); // 新增搜索文本状态


    useEffect(() => {
        fetchProcesses(value.host_id)
    }, [])

    function TimestampConverter(timestampInSeconds) {
        const date = new Date(timestampInSeconds * 1000);

        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        const hours = ('0' + date.getHours()).slice(-2);
        const minutes = ('0' + date.getMinutes()).slice(-2);
        const seconds = ('0' + date.getSeconds()).slice(-2);

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }


    function formatMemory(memoryUsed) {

        if (memoryUsed >= 1024) {
            return (memoryUsed / 1024).toFixed(2) + ' MB';
        } else if (memoryUsed >= 0) {
            return (memoryUsed) + ' KB';
        }
    }

    function fetchProcesses() {
        console.log("host_id:" + value.host_id, "processFetching:" + processFetching)
        setProcessFetching(true);
        return http.post('/api/host/processes/', {
            'host_id': value.host_id
        })
            .then(res => {
                setDataSource(res)
            })
            .finally(() => setProcessFetching(false))
    }

    function handleSearch(value) {
        setSearchText(value);
    }

    const filteredDataSource = dataSource.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.pid.toString().includes(searchText.toLowerCase()) ||
        item.command.toLowerCase().includes(searchText.toLowerCase())
    );

    return (<TableCard
        tKey="mi"
        rowKey="id"
        title={<Input.Search allowClear value={searchText} placeholder="输入进程名/PID/命令检索" style={{maxWidth: 250}}
                             onChange={e => handleSearch(e.target.value)}/>}
        loading={processFetching}
        dataSource={filteredDataSource}
        onReload={fetchProcesses}
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
        <Table.Column title="进程名 / PID / PPID" width={200}
                      render={info => `${info.name} / ${info.pid} / ${info.ppid}`}/>
        <Table.Column title="用户 / UID" width={100}
                      render={info => `${info.username} / ${info.uid}`}/>
        <Table.Column title="启动时间" width={200}
                      render={info => `${TimestampConverter(info.start_time)}`}/>
        <Table.Column title="CPU" width={100}
                      render={info => `${info.cpu_usage}%`}
                      sorter={(a, b) => a.cpu_usage.localeCompare(b.cpu_usage)}
                      defaultSortOrder="descend"
                      sortDirections={['descend']}
        />
        <Table.Column title="内存" width={200}
                      render={info => {
                          return formatMemory(info.memory) + `(${info.memory_usage}%)`
                      }}
                      sorter={(a, b) => a.memory_usage.localeCompare(b.memory_usage)}
                      defaultSortOrder="descend"
                      sortDirections={['descend']}
        />
        <Table.Column title="命令参数"
                      render={info => `${info.command}`}
                      ellipsis
        />
    </TableCard>)
})