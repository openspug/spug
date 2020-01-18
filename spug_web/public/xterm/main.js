let style = {};

function get_cell_size(term) {
  style.width = term._core._renderService._renderer.dimensions.actualCellWidth;
  style.height = term._core._renderService._renderer.dimensions.actualCellHeight;
}


function current_geometry(term) {
  if (!style.width || !style.height) {
    get_cell_size(term);
  }

  const cols = parseInt(window.innerWidth / style.width, 10) - 1;
  const rows = parseInt(window.innerHeight / style.height, 10);
  return {'cols': cols, 'rows': rows};
}


function resize_terminal(term) {
  const geometry = current_geometry(term);
  term.on_resize(geometry.cols, geometry.rows);
}


function read_as_text_with_decoder(file, callback, decoder) {
  let reader = new window.FileReader();

  if (decoder === undefined) {
    decoder = new window.TextDecoder('utf-8', {'fatal': true});
  }

  reader.onload = function () {
    let text;
    try {
      text = decoder.decode(reader.result);
    } catch (TypeError) {
      console.log('Decoding error happened.');
    } finally {
      if (callback) {
        callback(text);
      }
    }
  };

  reader.onerror = function (e) {
    console.error(e);
  };

  reader.readAsArrayBuffer(file);
}


function read_as_text_with_encoding(file, callback, encoding) {
  let reader = new window.FileReader();

  if (encoding === undefined) {
    encoding = 'utf-8';
  }

  reader.onload = function () {
    if (callback) {
      callback(reader.result);
    }
  };

  reader.onerror = function (e) {
    console.error(e);
  };

  reader.readAsText(file, encoding);
}


function read_file_as_text(file, callback, decoder) {
  if (!window.TextDecoder) {
    read_as_text_with_encoding(file, callback, decoder);
  } else {
    read_as_text_with_decoder(file, callback, decoder);
  }
}


function run(id, token) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const sock = new window.WebSocket(`${protocol}//${window.location.host}/api/ws/ssh/${token}/${id}/`),
    encoding = 'utf-8',
    decoder = window.TextDecoder ? new window.TextDecoder(encoding) : encoding,
    terminal = document.getElementById('terminal'),
    term = new window.Terminal({
      cursorBlink: true,
      theme: {
        background: 'black'
      }
    });

  term.fitAddon = new window.FitAddon.FitAddon();
  term.loadAddon(term.fitAddon);

  function term_write(text) {
    if (term) {
      term.write(text);
      if (!term.resized) {
        resize_terminal(term);
        term.resized = true;
      }
    }
  }

  term.on_resize = function (cols, rows) {
    if (cols !== this.cols || rows !== this.rows) {
      this.resize(cols, rows);
      sock.send(JSON.stringify({'resize': [cols, rows]}));
    }
  };

  term.onData(function (data) {
    sock.send(JSON.stringify({'data': data}));
  });

  sock.onopen = function () {
    term.open(terminal);
    term.fitAddon.fit();
    term.focus();
  };

  sock.onmessage = function (msg) {
    read_file_as_text(msg.data, term_write, decoder);
  };

  sock.onerror = function (e) {
    console.error(e);
  };

  sock.onclose = function (e) {
    if (e.code === 3333) {
      window.location.href = "about:blank";
      window.close()
    } else {
      setTimeout(() => term_write('\r\nConnection is closed.\r\n'), 200)
    }
  };

  window.onresize = function () {
    if (term) {
      resize_terminal(term);
    }
  };
}
