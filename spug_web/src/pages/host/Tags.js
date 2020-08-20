/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React from 'react';
import { observer } from 'mobx-react';
import { Tag } from 'antd';
import store from './store';

const { CheckableTag } = Tag;

@observer
class Tags extends React.Component {

  handleChange = (tag, checked) => {
    const selectedTags = store.selectedTags;
    const nextSelectedTags = checked ? [...selectedTags, tag] : selectedTags.filter(t => t !== tag);
    store.selectedTags = nextSelectedTags
  }

  render() {
    const selectedTags = store.selectedTags;
    return (
      <>
        <span style={{ marginRight: 8 }}>选择标签:</span>
        {store.tagsData.map(tag => (
          <CheckableTag
            key={tag}
            checked={selectedTags.indexOf(tag) > -1}
            onChange={checked => this.handleChange(tag, checked)}
          >
            {tag}
          </CheckableTag>
        ))}
      </>
    );
  }
}

export default Tags
