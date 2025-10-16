import './App.css'
import Router from './components/Router'
import Context from './components/Context'

function App() {

  return (
    <>
      <Context.Provider >
        <Router />
      </Context.Provider>
    </>
  );
}

export default App;
