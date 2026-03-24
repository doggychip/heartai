import { Route, Switch } from 'wouter';
import Dashboard from './pages/Dashboard';
import ChildDetail from './pages/ChildDetail';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/child/:childId" component={ChildDetail} />
    </Switch>
  );
}
