import React from 'react';
import { observer } from 'mobx-react';
import { Drawer} from 'antd';
import store from './store';

export default observer(function () {
  return (
    <Drawer
      width={500}
      title={store.record.name}
      placement="right"
      onClose={() => store.detailVisible = false}
      visible={store.detailVisible}>

    </Drawer>
  )
})