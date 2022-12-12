export const NODES = [
  {module: 'remote_exec', name: '执行命令'},
  {module: 'build', name: '构建'},
  {module: 'parameter', name: '参数化'},
  {module: 'data_transfer', name: '数据传输'},
  {module: 'data_upload', name: '数据上传'},
  {module: 'push_dd', name: '钉钉推送'},
  {module: 'push_spug', name: '推送助手'},
]

export const DATAS = {
  'name': 'test',
  'pipeline': [
    {
      'module': 'build',
      'name': '构建',
      'id': 0,
      'repository': 1,
      'target': 2,
      'workspace': '/data/spug',
      'command': 'mvn build',
      'downstream': [
        {'id': 1, 'state': 'success'}
      ]
    },
    {
      'module': 'remote_exec',
      'name': '执行命令',
      'id': 1,
      'targets': [2, 3],
      'interpreter': 'sh',
      'command': 'date && sleep 3',
      'downstream': [
        {'id': 2, 'state': 'success'}
      ]
    },
    {
      'module': 'data_transfer',
      'name': '数据传输',
      'id': 2,
      'source': {
        'target': 1,
        'path': '/data/spug'
      },
      'dest': {
        'targets': [2, 3],
        'path': '/data/dist'
      }
    }
  ]
}
