import { Route, Switch } from 'wouter';
import Dashboard from './pages/Dashboard';
import ChildDetail from './pages/ChildDetail';
import MilestoneLibrary from './pages/MilestoneLibrary';
import SiblingPortraits from './pages/SiblingPortraits';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/child/:childId" component={ChildDetail} />
      <Route path="/milestone-library" component={MilestoneLibrary} />
      <Route path="/siblings" component={SiblingPortraits} />
    </Switch>
  );
}
