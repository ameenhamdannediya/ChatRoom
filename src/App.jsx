import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import Home from "./components/HOme";
import JoinSession from "./components/JoinSession";
import ChatRoom from "./components/ChatRoom";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route  path="/"  element={<Home/>}   />
        <Route  path="/join"  element={<JoinSession />} />
        <Route path="/room/:roomId" element={<ChatRoom />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;