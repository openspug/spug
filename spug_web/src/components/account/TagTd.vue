<template>
    <td @click="check"><el-tag :type="tag_type" style="cursor: pointer">{{item.desc}}</el-tag></td>
</template>

<script>
    export default {
        props: ['item'],
        data() {
            return {}
        },
        computed: {
            tag_type() {
                return (this.item['is_has']) ? 'primary' : 'info'
            }
        },
        methods: {
            check() {
                this.item['is_has'] = !this.item['is_has']
            }
        }
    }
</script>