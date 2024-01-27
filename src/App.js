import {BrowserRouter,Route,Switch} from "react-router-dom"
import Register from "./register";
import Login from "./login";
import ProtectedRoute from "./protectedRoute";
import MainPage from "./Mainpage";
import './App.css';

function App() {
  return (
    <div>
      <BrowserRouter>
        <Switch>
          <ProtectedRoute exact path ="/" component={MainPage} />
          <Route exact path="/register" component={Register} />
          <Route exact path="/login" component={Login} />
        </Switch>
      </BrowserRouter>
    </div>
  );
}

export default App;
