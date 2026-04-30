import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  value?: string;
  onChange?: (html: string) => void;
  height?: number;
};

function escapeForInjectedJs(str: string) {
  return JSON.stringify(str ?? '');
}

export default function RichHtmlEditor({
  value = '',
  onChange,
  height = 260,
}: Props) {
  const webRef = useRef<WebView>(null);
  const lastSentValueRef = useRef(value);

  const html = useMemo(
    () => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
  />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background: #ffffff;
      font-family: Arial, sans-serif;
      color: #111827;
      overflow: hidden;
    }

    .root {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 6px;
      background: #f3f4f6;
      border-bottom: 1px solid #d1d5db;
      flex: 0 0 auto;
    }

    button, select {
      height: 30px;
      border: 1px solid #bfc7d1;
      background: #fff;
      color: #111827;
      font-size: 13px;
      padding: 0 8px;
      border-radius: 2px;
    }

    button {
      min-width: 30px;
    }

    .editor-wrap {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      background: #fff;
    }

    #editor {
      min-height: 100%;
      box-sizing: border-box;
      padding: 10px;
      outline: none;
      font-size: 15px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      caret-color: #111827;
    }

    p { margin: 0 0 10px 0; }
    ul, ol { padding-left: 22px; }
    blockquote {
      margin: 8px 0;
      padding-left: 12px;
      border-left: 3px solid #cbd5e1;
      color: #475569;
    }
    a { color: #2563eb; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="root">
    <div class="toolbar">
      <button onclick="cmd('undo')" type="button">↶</button>
      <button onclick="cmd('redo')" type="button">↷</button>
      <button onclick="cmd('bold')" type="button"><b>B</b></button>
      <button onclick="cmd('italic')" type="button"><i>I</i></button>
      <button onclick="cmd('underline')" type="button"><u>U</u></button>
      <button onclick="cmd('insertUnorderedList')" type="button">• Liste</button>
      <button onclick="cmd('insertOrderedList')" type="button">1. Liste</button>
      <button onclick="cmd('justifyLeft')" type="button">⟸</button>
      <button onclick="cmd('justifyCenter')" type="button">≡</button>
      <button onclick="cmd('justifyRight')" type="button">⟹</button>
      <button onclick="insertLink()" type="button">Lien</button>

      <select onchange="formatBlock(this.value)">
        <option value="">Format</option>
        <option value="p">Paragraphe</option>
        <option value="h1">Titre 1</option>
        <option value="h2">Titre 2</option>
        <option value="h3">Titre 3</option>
        <option value="blockquote">Citation</option>
      </select>
    </div>

    <div class="editor-wrap">
      <div id="editor" contenteditable="true"></div>
    </div>
  </div>

  <script>
    const editor = document.getElementById('editor');
    let lastHtml = '';
    let isApplyingExternalValue = false;

    function sendHtml() {
      const html = editor.innerHTML;
      lastHtml = html;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'change',
        html
      }));
    }

    function cmd(command, value = null) {
      document.execCommand(command, false, value);
      editor.focus();
      sendHtml();
    }

    function formatBlock(value) {
      if (!value) return;
      document.execCommand('formatBlock', false, value);
      editor.focus();
      sendHtml();
    }

    function insertLink() {
      const url = prompt("Entrer l'URL");
      if (!url) return;
      document.execCommand('createLink', false, url);
      editor.focus();
      sendHtml();
    }

    function placeCursorAtEnd(el) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function setHtmlPreserveCursor(newHtml) {
      const nextHtml = newHtml || '';
      if (nextHtml === lastHtml) return;
      isApplyingExternalValue = true;
      editor.innerHTML = nextHtml;
      lastHtml = editor.innerHTML;
      placeCursorAtEnd(editor);
      isApplyingExternalValue = false;
    }

    window.__setEditorHtml = function(newHtml) {
      setHtmlPreserveCursor(newHtml);
    };

    editor.innerHTML = '';
    lastHtml = editor.innerHTML;

    editor.addEventListener('input', function() {
      if (!isApplyingExternalValue) sendHtml();
    });

    editor.addEventListener('keyup', function() {
      if (!isApplyingExternalValue) sendHtml();
    });

    window.addEventListener('message', function(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'setHtml') {
          setHtmlPreserveCursor(msg.html || '');
        }
      } catch (e) {}
    });
  </script>
</body>
</html>
`,
    []
  );

  useEffect(() => {
    if (!webRef.current) return;
    if (value === lastSentValueRef.current) return;

    const injected = `
      window.__setEditorHtml(${escapeForInjectedJs(value)});
      true;
    `;

    webRef.current.injectJavaScript(injected);
    lastSentValueRef.current = value;
  }, [value]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        scrollEnabled={false}
        onLoadEnd={() => {
          const injected = `
            window.__setEditorHtml(${escapeForInjectedJs(value)});
            true;
          `;
          webRef.current?.injectJavaScript(injected);
          lastSentValueRef.current = value;
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === 'change') {
              onChange?.(data.html || '');
            }
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
});