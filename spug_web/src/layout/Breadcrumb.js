import React from 'react';
import { Breadcrumb } from 'antd';
import menu from './menu';

export default class extends React.Component {
    constructor(props) {
        super(props);
        this.lastPath = window.location.pathname;
        const breadInfo = menu[this.lastPath];
        this.state = {
            breadInfo: Array.isArray(breadInfo) ? breadInfo : [],
        }
    }

    componentDidUpdate() {
        const curPath = window.location.pathname;
        if (this.lastPath !== curPath) {
            this.lastPath = curPath;
            const breadInfo = menu[curPath];
            this.setState({
                breadInfo: Array.isArray(breadInfo) ? breadInfo : [],
            });
        }
    }

    render() {
        return (
            <div>
                {
                    !!this.state.breadInfo.length && (
                        <div style={{
                            width: '100%',
                            height: '54px',
                            overflow: 'hidden',
                            background: '#fff',
                            padding: '16px 32px 0',
                            borderBottom: '1px solid #e8e8e8',
                            zIndex: 1
                        }}>
                            <Breadcrumb>
                                <Breadcrumb.Item></Breadcrumb.Item>
                                {
                                    this.state.breadInfo.map(item => {
                                        return (
                                            <Breadcrumb.Item key={item.title}>
                                                {
                                                    item.href ? (<a href={item.href}>{item.title}</a>) : item.title
                                                }
                                            </Breadcrumb.Item>
                                        )
                                    })
                                }
                            </Breadcrumb>
                        </div>
                    )
                }
            </div>
        )
    }
}