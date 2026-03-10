import './App.css'

function App() {
  return (
    <div className="hub">
      <div className="cloud-layer"></div>
      
      <div className="content">
        <h1>quips</h1>
        <nav>
          <a href="/bats" className="nav-link">bats</a>
          <a href="/glyphs" className="nav-link">glyphs</a>
          <a href="/germ" className="nav-link germ-link">germ</a>
       </nav>
      </div>

      <p className="footer">built on the atmosphere</p>
    </div>
  )
}

export default App

