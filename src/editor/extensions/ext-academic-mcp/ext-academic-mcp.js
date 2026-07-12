/**
 * @file ext-academic-mcp.js
 *
 * SVG-Edit extension that bridges the editor to the Academic Figure MCP server.
 *
 * Provides Open / Save / Reload buttons that communicate with the MCP server's
 * HTTP bridge over localhost:4321, allowing AI agents (via MCP) and human
 * editors (via SVG-Edit) to co-edit a structured SVG document.
 *
 * @license MIT
 */

const name = "academic-mcp"

const MCP_BRIDGE_URL = "http://localhost:4321"

// ---------------------------------------------------------------------------
// Translation loader (follows SVG-Edit extension conventions)
// ---------------------------------------------------------------------------

const loadExtensionTranslation = async function (svgEditor) {
  let translationModule
  const lang = svgEditor.configObj.pref("lang")
  try {
    translationModule = await import(`./locale/${lang}.js`)
  } catch (_error) {
    console.warn(`Missing translation (${lang}) for ${name} - using 'en'`)
    translationModule = await import("./locale/en.js")
  }
  svgEditor.i18next.addResourceBundle(lang, name, translationModule.default)
}

// ---------------------------------------------------------------------------
// Extension API
// ---------------------------------------------------------------------------

export default {
  name,

  async init({ _importLocale }) {
    const svgEditor = this
    await loadExtensionTranslation(svgEditor)
    const { svgCanvas } = svgEditor
    const { $id, $click } = svgCanvas

    // ---- State ----
    let currentDocumentId = null

    // ---- UI helpers ----
    function showStatus(message, isError = false) {
      const el = $id("mcp_bridge_status")
      if (el) {
        el.textContent = message
        el.style.color = isError ? "#d32f2f" : "#388e3c"
        el.style.display = "inline-block"
      }
    }

    function getDocumentId() {
      const input = $id("mcp_document_id")
      return input ? input.value.trim() : ""
    }

    // ---- Bridge operations ----

    async function openDocument() {
      const documentId = getDocumentId()
      if (!documentId) {
        showStatus("Enter a document ID", true)
        return
      }

      showStatus("Loading...")

      try {
        const response = await fetch(
          `${MCP_BRIDGE_URL}/api/documents/${documentId}/svg`
        )

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          showStatus(
            `Error: ${err.message || response.statusText}`,
            true
          )
          return
        }

        const svgString = await response.text()

        // Load into SVG-Edit canvas
        const success = svgCanvas.setSvgString(svgString)
        if (success === false) {
          showStatus("Failed to parse SVG", true)
          return
        }

        currentDocumentId = documentId
        showStatus(`Opened: ${documentId}`)
      } catch (err) {
        showStatus(`Connection error: ${err.message}`, true)
      }
    }

    async function saveDocument() {
      const documentId = getDocumentId() || currentDocumentId
      if (!documentId) {
        showStatus("No document ID", true)
        return
      }

      showStatus("Saving...")

      try {
        const svgString = svgCanvas.getSvgString()

        const response = await fetch(
          `${MCP_BRIDGE_URL}/api/documents/${documentId}/svg`,
          {
            method: "PUT",
            headers: { "Content-Type": "image/svg+xml" },
            body: svgString,
          }
        )

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          showStatus(
            `Save error: ${err.message || response.statusText}`,
            true
          )
          return
        }

        const data = await response.json()
        currentDocumentId = documentId
        showStatus(`Saved r${data.revision}`)

        // Trigger preview re-render on MCP side
        fetch(
          `${MCP_BRIDGE_URL}/api/documents/${documentId}/render`,
          { method: "POST" }
        ).catch(() => {})
      } catch (err) {
        showStatus(`Connection error: ${err.message}`, true)
      }
    }

    async function reloadDocument() {
      const documentId = getDocumentId() || currentDocumentId
      if (!documentId) {
        showStatus("No document ID", true)
        return
      }

      showStatus("Reloading...")

      try {
        const response = await fetch(
          `${MCP_BRIDGE_URL}/api/documents/${documentId}/svg`
        )

        if (!response.ok) {
          showStatus("Reload failed", true)
          return
        }

        const svgString = await response.text()
        svgCanvas.setSvgString(svgString)
        currentDocumentId = documentId
        showStatus(`Reloaded: ${documentId}`)
        svgEditor.i18next.t(`${name}:reload_warning`)
      } catch (err) {
        showStatus(`Connection error: ${err.message}`, true)
      }
    }

    return {
      name: svgEditor.i18next.t(`${name}:name`),

      callback() {
        // Inject UI into the top panel area
        const toolsLeft = $id("tools_left")
        if (!toolsLeft) {
          console.warn("[ext-academic-mcp] #tools_left not found — UI skipped")
          return
        }

        const container = document.createElement("div")
        container.id = "mcp_bridge_panel"
        container.style.cssText =
          "padding:8px;border-top:1px solid #ccc;margin-top:8px;"

        container.innerHTML = `
          <div style="font-weight:bold;margin-bottom:4px;font-size:11px;">
            MCP Bridge
          </div>
          <input
            id="mcp_document_id"
            type="text"
            placeholder="Document ID"
            style="width:100%;box-sizing:border-box;padding:3px 5px;font-size:11px;margin-bottom:4px;"
          />
          <div style="display:flex;gap:3px;flex-wrap:wrap;">
            <button id="mcp_open_btn" style="flex:1;font-size:10px;padding:3px;">Open</button>
            <button id="mcp_save_btn" style="flex:1;font-size:10px;padding:3px;">Save</button>
            <button id="mcp_reload_btn" style="flex:1;font-size:10px;padding:3px;">Reload</button>
          </div>
          <span id="mcp_bridge_status" style="font-size:10px;margin-top:3px;display:none;"></span>
        `

        toolsLeft.appendChild(container)

        // Wire up events
        $click($id("mcp_open_btn"), openDocument)
        $click($id("mcp_save_btn"), saveDocument)
        $click($id("mcp_reload_btn"), reloadDocument)
      },
    }
  },
}
