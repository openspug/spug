/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Card, Cascader } from 'antd';
import { Chart, Geom, Axis, Tooltip } from 'bizcharts';
import { http } from 'libs';

export default function () {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState([]);
  const [params, setParams] = useState({});
  const [res, setRes] = useState([]);

  useEffect(() => {
    setLoading(true);
    http.get('/api/home/alarm/', {params})
      .then(res => setRes(res))
      .finally(() => setLoading(false))
  }, [params])

  useEffect(() => {
    const data = {};
    http.get('/api/monitor/')
      .then(res => {
        for (let item of res.detections) {
          if (!data[item.type]) {
            data[item.type] = {value: item.type_alias, label: item.type_alias, children: []}
          }
          data[item.type].children.push({value: item.name, label: item.name})
        }
        setOptions(Object.values(data))
      })
  }, [])

  function handleChange(v) {
    switch (v.length) {
      case 2:
        setParams({name: v[1]});
        break;
      case 1:
        setParams({type: v[0]});
        break;
      default:
        setParams({})
    }
  }

  return (
    <Card loading={loading} title="报警趋势" bodyStyle={{height: 353}} extra={(
      <Cascader changeOnSelect style={{width: 260}} options={options} onChange={handleChange} placeholder="过滤监控项，默认所有"/>
    )}>
      <Chart height={300} data={res} padding={[10, 10, 30, 35]} scale={{value: {alias: '报警次数'}}} forceFit>
        <Axis name="date"/>
        <Axis name="value"/>
        <Tooltip
          crosshairs={{
            type: "y"
          }}
        />
        <Geom type="line" position="date*value" size={2} shape={"smooth"}/>
        <Geom
          type="point"
          position="date*value"
          size={4}
          shape={"circle"}
          style={{
            stroke: "#fff",
            lineWidth: 1
          }}
        />
      </Chart>
    </Card>
  )
}
