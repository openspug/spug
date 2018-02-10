<template>
    <code ref="code" class="bash bash-code" v-html="content" @blur="onInput" @input="onInput3" @keydown="onInput2" spellcheck="false"></code>
</template>

<script>
    import hl_js from '../../assets/js/highlight-bash.min'
    export default {
        props: ['value', 'init_value'],
        data () {
            return {
                content: ''
            }
        },
        computed: {
            currentValue: {
                get: function () {
                    return (this.value) ? this.value : ''
                },
                set: function (val) {
                    this.$emit('input', val)
                }
            }
        },
        methods: {
            onInput () {
                this.content = hl_js.highlight('bash', this.$refs['code'].textContent).value
            },
            onInput2 (event) {
                if (event.keyCode === 9) {
                    event.preventDefault();
                    let selection = getSelection();
                    let old_range = selection.getRangeAt(0);
                    let new_offset = old_range.endOffset + 4;
                    let prefix_str = old_range.endContainer.textContent.substring(0, old_range.endOffset);
                    let suffix_str = old_range.endContainer.textContent.substring(old_range.endOffset, );
                    old_range.endContainer.textContent = prefix_str + '    ' + suffix_str;
                    let new_range = document.createRange();
                    new_range.setStart(old_range.endContainer, new_offset);
                    selection.removeAllRanges();
                    selection.addRange(new_range)
                }
            },
            onInput3 () {
                this.currentValue = this.$refs['code'].textContent
            }
        },
        mounted () {
            this.$refs['code'].textContent = this.currentValue;
            hl_js.highlightBlock(this.$refs['code']);
            this.$watch('currentValue', function (val) {
                if (val !== this.$refs['code'].textContent) {
                    this.$refs['code'].textContent = val;
                    this.onInput()
                }
            })
        }
    }
</script>

<style>
    .bash-code {
        -webkit-user-modify: read-write-plaintext-only;
        font-family: Consolas, "Courier New", monospace;
        white-space: pre-wrap;
        line-height: normal;
    }

    .hljs {
        display: block;
        overflow-x: auto;
        padding: 0.5em;
        color: #abb2bf;
        background: #282c34
    }

    .hljs-comment, .hljs-quote {
        color: #5c6370;
        font-style: italic
    }

    .hljs-doctag, .hljs-keyword, .hljs-formula {
        color: #c678dd
    }

    .hljs-section, .hljs-name, .hljs-selector-tag, .hljs-deletion, .hljs-subst {
        color: #e06c75
    }

    .hljs-literal {
        color: #56b6c2
    }

    .hljs-string, .hljs-regexp, .hljs-addition, .hljs-attribute, .hljs-meta-string {
        color: #98c379
    }

    .hljs-built_in, .hljs-class .hljs-title {
        color: #e6c07b
    }

    .hljs-attr, .hljs-variable, .hljs-template-variable, .hljs-type, .hljs-selector-class, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-number {
        color: #d19a66
    }

    .hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id, .hljs-title {
        color: #61aeee
    }

    .hljs-emphasis {
        font-style: italic
    }

    .hljs-strong {
        font-weight: bold
    }

    .hljs-link {
        text-decoration: underline
    }
</style>