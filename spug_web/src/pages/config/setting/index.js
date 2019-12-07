import React from 'react';
import { observer } from 'mobx-react';
import { Menu, Input, Button } from 'antd';
import envStore from '../environment/store';
import styles from './index.module.css';
import { SearchForm } from 'components';
import ComTable from './Table';
import store from './store';

@observer
class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // envId: 0
    }
  }

  componentDidMount() {
    const {type, id} = this.props.match.params;
    store.type = type;
    store.id = id;
    if (envStore.records.length === 0) {
      envStore.fetchRecords().then(() => this.updateEnv())
    } else {
      this.updateEnv()
    }
  }

  updateEnv = (env) => {
    store.env = env || envStore.records[0];
    store.fetchRecords()
  };

  render() {
    return (
      <div className={styles.container}>
        <div className={styles.left}>
          <Menu
            mode="inline"
            selectedKeys={[String(store.env.id)]}
            style={{border: 'none'}}
            onSelect={({item}) => this.updateEnv(item.props.env)}>
            {envStore.records.map(item => (
              <Menu.Item key={item.id} env={item}>{item.name} ({item.key})</Menu.Item>
            ))}
          </Menu>
        </div>
        <div className={styles.right}>
          <SearchForm>
            <SearchForm.Item span={8} title="Key">
              <Input allowClear onChange={e => store.f_name = e.target.value} placeholder="请输入"/>
            </SearchForm.Item>
            <SearchForm.Item span={4}>
              <Button type="primary" icon="sync" onClick={store.fetchRecords}>刷新</Button>
            </SearchForm.Item>
            <SearchForm.Item span={4}>
              <Button type="primary" style={{backgroundColor: 'orange', borderColor: 'orange'}} icon="history"
                      onClick={store.fetchRecords}>更改历史</Button>
            </SearchForm.Item>
            <SearchForm.Item span={8} style={{textAlign: 'right'}}>
              <Button type="primary" icon="plus" onClick={() => store.showForm()}>新增配置</Button>
            </SearchForm.Item>
          </SearchForm>
          <ComTable/>
        </div>
      </div>
    )
  }
}

export default Index