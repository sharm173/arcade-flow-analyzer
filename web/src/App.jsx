import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import './index.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/report" element={<ReportPage />} />
    </Routes>
  )
}

function AppHeader() {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <div className="brand"><img src="/logo.svg" alt="logo" />Arcade Analyzer</div>
        <nav className="nav-links">
          <a href="#">Docs</a>
          <a href="#">GitHub</a>
        </nav>
      </div>
    </header>
  )
}

function UploadPage() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [hasFile, setHasFile] = useState(false)
  const [loading, setLoading] = useState(false)
  function toReportWith(data){
    navigate('/report',{ state: data })
  }
  function onFileSelected(file){
    fileRef.current = file
    setFileName(file.name)
    setHasFile(true)
    const dz = document.querySelector('.dropzone')
    if (dz){ dz.classList.add('selected') }
  }
  async function handleAnalyze(){
    if (loading) return
    if (!fileRef.current){
      const input = document.getElementById('flowfile')
      if (!input || !input.files || !input.files[0]) return
      onFileSelected(input.files[0])
    }
    const fd = new FormData()
    fd.append('file', fileRef.current)
    setLoading(true)
    try {
      const resp = await fetch('http://localhost:8787/api/analyze',{ method:'POST', body: fd })
      const data = await resp.json()
      toReportWith(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    const dz = document.querySelector('.dropzone')
    if (!dz) return
    function prevent(e){ e.preventDefault(); e.stopPropagation() }
    function onEnter(e){ prevent(e); dz.classList.add('active') }
    function onOver(e){ prevent(e); dz.classList.add('active') }
    function onLeave(e){ prevent(e); dz.classList.remove('active') }
    function onDrop(e){
      prevent(e); dz.classList.remove('active')
      const file = e.dataTransfer?.files?.[0]
      if (file){ onFileSelected(file) }
    }
    dz.addEventListener('dragenter', onEnter)
    dz.addEventListener('dragover', onOver)
    dz.addEventListener('dragleave', onLeave)
    dz.addEventListener('drop', onDrop)
    return ()=>{
      dz.removeEventListener('dragenter', onEnter)
      dz.removeEventListener('dragover', onOver)
      dz.removeEventListener('dragleave', onLeave)
      dz.removeEventListener('drop', onDrop)
    }
  },[])
  return (
    <div className="page">
      <AppHeader />
      <main className="container">
        <h1 className="title">Analyze Your Arcade Flows</h1>
        <p className="subtitle">Upload your flow.json files and get instant human-readable reports
        plus shareable social media images</p>

        <section className={`card dropzone-card loading-wrap`}>
          {loading && (
            <div className="overlay"><div className="spinner"></div></div>
          )}
          <div className="dropzone">
            <div className="dropzone-icon">⬆️</div>
            <div className="dropzone-title">Drop your flow.json file here</div>
            <div className="dropzone-sub">or click to browse from your computer</div>
            <div className="dropzone-note">Accepts .json files only</div>
            {hasFile && <div className="filename">{fileName}</div>}
            <input id="flowfile" type="file" accept="application/json,.json" style={{display:'none'}} onChange={(e)=>{ if(e.target.files?.[0]) onFileSelected(e.target.files[0]) }} />
          </div>
          <div className="actions">
            <button className="btn outline" onClick={()=>document.getElementById('flowfile').click()} disabled={loading}>Choose File</button>
            <button className="btn primary" onClick={handleAnalyze} disabled={!hasFile || loading}>{loading ? 'Analyzing…' : 'Analyze Flow'}</button>
          </div>
        </section>
      </main>
    </div>
  )
}

function ReportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state || { interactions:[], summary:'', caption:'', image_b64:'' }
  return (
    <div className="page">
      <main className="container report-grid">
        <div className="back-link" onClick={()=>navigate('/')} style={{cursor:'pointer'}}>← Back to Upload</div>
        <section className="card wide">
          <h2>Flow Analysis Report</h2>
          <p className="muted">Complete breakdown of user interactions and journey</p>

          <div className="overview">
            <div className="pill"><div className="pill-num">{data.interactions?.length || 0}</div><div>Interactions</div></div>
            <div className="pill"><div className="pill-num">—</div><div>Duration</div></div>
            <div className="pill"><div className="pill-num">—</div><div>Completion</div></div>
          </div>

          <h3>User Interactions</h3>
          <ol className="steps">
            {(data.interactions || []).map((text, i) => (
              <li key={i} className="step">
                <div className="step-index">{i + 1}</div>
                <div className="step-body">
                  <div className="step-title">{text}</div>
                  <div className="step-sub"></div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <aside className="sidebar">
          <section className="card">
            <h3>Flow Summary</h3>
            <p className="muted">{data.summary || ''}</p>
          </section>

          <section className="card">
            <h3>Social Caption</h3>
            <div className="caption">{data.caption || ''}</div>
          </section>

          <section className="card">
            <h3>Share Image</h3>
            {data.image_b64 ? (
              <img alt="generated" src={`data:image/png;base64,${data.image_b64}`} style={{width:'100%',borderRadius:12,marginBottom:12}} />
            ) : (
              <div className="share-image">Generating…</div>
            )}
            {data.image_b64 && (
              <a className="btn primary full" download="social_image.png" href={`data:image/png;base64,${data.image_b64}`}>Download Image</a>
            )}
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App
