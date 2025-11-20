import { render } from "solid-js/web"
import App from "./App"
import { ThemeProvider } from "./lib/theme"
import { ConfigProvider } from "./stores/preferences"
import { InstanceConfigProvider } from "./stores/instance-config"
import "./index.css"
import "@git-diff-view/solid/styles/diff-view-pure.css"

const root = document.getElementById("root")

if (!root) {
  throw new Error("Root element not found")
}

render(
  () => (
    <ConfigProvider>
      <InstanceConfigProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </InstanceConfigProvider>
    </ConfigProvider>
  ),
  root,
)
