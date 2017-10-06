import captureException from '../../Shared/Opbeat'

const start = (CodeMirror, app) => {
  const linterFormatDiv = document.createElement('div')

  CodeMirror.registerHelper('lint', 'elm', (text, options, instance) => {
    return instance.__ellie_errors || []
  })

  app.ports.viewsEditorsOut.subscribe(data => {
    requestAnimationFrame(() => {
      switch (data.tag) {
        case 'Setup':
          setup(data.id, data.options)
          return

        case 'UpdateLinter':
          updateLinter(data.id, data.messages)
          return

        case 'UpdateValue':
          updateValue(data.id, data.value)
          return

        case 'UpdateOptions':
          updateOptions(data.id, data.options)
          return

        default:
          captureException({
            tag: 'UnknownOutboundPortMessage',
            message: `Unexpected port message from Views.Editors: "${data.tag}"`,
            line: 31,
            moduleName: 'Views/Editors/Runner.js',
            extraData: data
          })
          return
      }
    })
  })

  const setup = (id, options) => {
    const element = document.getElementById(id)
    if (!element || element.__CODE_MIRROR_INSTANCE_ELM__) return

    const instance = CodeMirror(element, {
      lineNumbers: true,
      styleActiveLine: { nonEmpty: true },
      smartIndent: true,
      indentWithTabs: false,
      indentWidth: options.tabSize,
      tabSize: options.tabSize,
      indentUnit: options.tabSize,
      lint: { lintOnChange: false },
      keyMap: options.vimMode ? 'vim' : 'default',
      readOnly: options.readOnly,
      mode: options.mode,
      theme: options.theme,
      value: options.initialValue,
      extraKeys: {
        Tab: function(cm) {
          let x = ""
          for (let i = cm.getOption('indentUnit'); i > 0; i--) {
            x += " "
          }
          cm.replaceSelection(x)
        }
      }
    })

    instance.__ellie_errors = []

    instance.on('change', () => {
      app.ports.viewsEditorsIn.send({
        tag: 'ValueChanged',
        id: id,
        value: instance.getValue()
      })
    })

    element.__CODE_MIRROR_INSTANCE_ELM__ = instance

    const wrapper = instance.getWrapperElement()
    wrapper.style.width = '100%'
    wrapper.style.height = '100%'

    requestAnimationFrame(() => {
      instance.refresh()
    })
  }

  const updateValue = (id, value) => {
    const element = document.getElementById(id)
    if (!element || !element.__CODE_MIRROR_INSTANCE_ELM__) return
    const instance = element.__CODE_MIRROR_INSTANCE_ELM__
    const prevScrollPosition = instance.getScrollInfo()
    instance.setValue(value)
    instance.scrollTo(prevScrollPosition.left, prevScrollPosition.top)
  }

  const updateLinter = (id, messages) => {
    const element = document.getElementById(id)
    if (!element || !element.__CODE_MIRROR_INSTANCE_ELM__) return
    const instance = element.__CODE_MIRROR_INSTANCE_ELM__

    instance.__ellie_errors = formatLinterMessages(messages)
    instance.performLint()
  }

  const updateSetting = (id, key, value) => {
    const element = document.getElementById(id)
    if (!element || !element.__CODE_MIRROR_INSTANCE_ELM__) return
    const instance = element.__CODE_MIRROR_INSTANCE_ELM__

    instance.setOption(key, value)
  }

  const updateOptions = (id, options) => {
    const element = document.getElementById(id)
    if (!element || !element.__CODE_MIRROR_INSTANCE_ELM__) return
    const instance = element.__CODE_MIRROR_INSTANCE_ELM__

    for (let k in options) {
      if (options[k] !== instance.getOption(k)) {
        instance.setOption(id, value)
      }
    }
  }

  const formatLinterMessages = messages => {
    return messages.map(message => {
      linterFormatDiv.innerHTML = message.message
      return {
        from: message.from,
        to: message.to,
        message: linterFormatDiv.innerText,
        severity: message.severity
      }
    })
  }
}


export default {
  start
}