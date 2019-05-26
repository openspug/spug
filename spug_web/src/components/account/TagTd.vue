<template>
    <td ><el-tag @click="check" type="info" :color="colorUpdate" style="cursor: pointer">{{item.desc}}</el-tag></td>
</template>

<script>
    export default {
        props: ['item'],
        data() {
            return {}
        },
        computed: {
            colorUpdate() {
                return (this.item['is_has']) ? '#99ffd6' : '#ffffff'
            },
        },
        methods: {
            check() {
                this.item['is_has'] = !this.item['is_has'];
            }
        }
    }
</script>
