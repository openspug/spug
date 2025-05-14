/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { Switch, Route } from 'react-router-dom';
import { Layout, message, Drawer, Button, Input } from 'antd';
import { NotFound } from 'components';
import Sider from './Sider';
import Header from './Header';
import Footer from './Footer';
import routes from '../routes';
import { hasPermission, isMobile } from 'libs';
import styles from './layout.module.less';
import { RobotOutlined } from '@ant-design/icons'; // AI 助理图标
import Markdown from 'markdown-to-jsx'; // 引入 markdown-to-jsx

function initRoutes(Routes, routes) {
  for (let route of routes) {
    if (route.component) {
      if (!route.auth || hasPermission(route.auth)) {
        Routes.push(<Route exact key={route.path} path={route.path} component={route.component} />);
      }
    } else if (route.child) {
      initRoutes(Routes, route.child);
    }
  }
}

export default function () {
  const [collapsed, setCollapsed] = useState(false);
  const [Routes, setRoutes] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false); // 控制抽屉显示
  const [messages, setMessages] = useState([]); // 存储对话消息
  const [loading, setLoading] = useState(false); // 控制加载状态
  const [context, setContext] = useState([]); // 新增上下文状态

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
      message.warn('检测到您在移动设备上访问，请使用横屏模式。', 5);
    }
    const Routes = [];
    initRoutes(Routes, routes);
    setRoutes(Routes);
  }, []);

  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

  const handleSendMessage = async (value) => {
    if (!value.trim()) return;
    const userMessage = { role: 'user', content: value };
    setMessages((prev) => [...prev, userMessage]); // 添加用户消息
    setContext((prev) => [...prev, userMessage]); // 更新上下文
    setLoading(true);

    try {
      const X_TOKEN = localStorage.getItem('token');
      const response = await fetch('/api/setting/ai_assistant/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Token': X_TOKEN,
        },
        body: JSON.stringify({ question: value, context }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let assistantMessage = { role: 'assistant', content: '' };

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          assistantMessage.content += chunk;
          setMessages((prev) => {
            const updatedMessages = [...prev];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage?.role === 'assistant') {
              lastMessage.content += chunk;
            } else {
              updatedMessages.push(assistantMessage);
            }
            return updatedMessages;
          });
        }
      }

      // 更新上下文
      setContext((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      message.error('AI 助理接口调用失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Sider collapsed={collapsed} />
      <Layout style={{ height: '100vh' }}>
        <Header collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} />
        <Layout.Content className={styles.content} id="spug-container">
          <Switch>
            {Routes}
            <Route component={NotFound} />
          </Switch>
          {/* AI 助理图标 */}
          <Button
            type="primary"
            shape="circle"
            icon={<RobotOutlined />}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
            onClick={toggleDrawer}
          />
          {/* 抽屉对话框 */}
          <Drawer
            title="AI 助理"
            placement="right"
            onClose={toggleDrawer}
            visible={drawerVisible}
            width={400}
          >
            <div style={{ height: 'calc(100% - 60px)', overflowY: 'auto', marginBottom: 16 }}>
              {/* AI 对话区域 */}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    padding: 16,
                    background: msg.role === 'user' ? '#e6f7ff' : '#f5f5f5',
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                >
                  <p>{msg.role === 'user' ? '用户：' : 'AI 助理：'}</p>
                  <Markdown>{msg.content}</Markdown> {/* 使用 Markdown 渲染内容 */}
                </div>
              ))}
              {loading && (
                <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                  <p>AI 助理正在输入...</p>
                </div>
              )}
            </div>
            {/* 输入框 */}
            <Input.Search
              placeholder="请输入内容..."
              enterButton="发送"
              onSearch={handleSendMessage}
              disabled={loading}
            />
          </Drawer>
        </Layout.Content>
        <Footer />
      </Layout>
    </Layout>
  );
}
