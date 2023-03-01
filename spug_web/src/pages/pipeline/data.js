export const NODES = [
  {module: 'ssh_exec', name: '执行命令'},
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
      'condition': 'success',
      'repository': 1,
      'target': 2,
      'workspace': '/data/spug',
      'command': 'mvn build',
      'downstream': [1, 2, 3]
    },
    {
      'module': 'remote_exec',
      'name': '执行命令',
      'id': 1,
      'targets': [2, 3],
      'interpreter': 'sh',
      'command': 'date && sleep 3',
    },
    {
      'module': 'data_transfer',
      'name': '数据传输',
      'id': 2,
      'source': {
        'target': 1,
        'path': '/data/spug'
      },
      'destination': {
        'targets': [2, 3],
        'path': '/data/dist'
      }
    },
    {
      'module': 'remote_exec',
      'name': '执行命令',
      'id': 3,
      'targets': [2, 3],
      'interpreter': 'sh',
      'command': 'date && sleep 3',
    },
    {
      'module': 'remote_exec',
      'name': '执行命令',
      'id': 4,
      'targets': [2, 3],
      'interpreter': 'sh',
      'command': 'date && sleep 3',
    },
    {
      'module': 'ssh_exec',
      'name': '执行命令',
      'id': 5,
      'targets': [2, 3],
      'interpreter': 'sh',
      'command': 'date && sleep 3',
    },
  ]
}
