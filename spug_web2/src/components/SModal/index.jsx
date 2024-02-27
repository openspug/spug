import { Modal } from 'antd'
import { clsNames } from '@/libs'
import css from './index.module.scss'

function SModal(props) {
    return (
        <Modal {...props} className={clsNames(css.modal, props.className)} />
    )
}

export default SModal