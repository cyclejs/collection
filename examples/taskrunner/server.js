import babelify from 'babelify';
import bodyParser from 'body-parser';
import browserify from 'browserify-middleware';
import cors from 'cors';
import express from 'express';
import hotModuleReloading from 'browserify-hmr';
import methodOverride from 'method-override';

const app = express();

app.use(bodyParser.json());
app.use(methodOverride());
app.use(cors());

let state = {
  _id: 0,
  tasks : [],
  add(props) {
    const id = String(this._id++);
    this.tasks = [...this.tasks, {
      ...props,
      id,
      status: 'running'
    }];
    setTimeout(() =>
      this.update(id, { status: 'complete' }),
      5000
    );
    return this.tasks;
  },
  remove(id) {
    this.tasks = this.tasks.filter(task => task.id !== id);
    return this.tasks;
  },
  update(id, patch) {
    this.tasks = this.tasks.map(task => task.id === id
      ? { ...task, ...patch }
      : task
    );
    return this.tasks;
  }
};

app.use(express.static(process.cwd()));

app.get('/bundle.js', browserify(__dirname + '/index.js', {
  transform: babelify,
  plugin: hotModuleReloading
}));

app.get('/tasks', (req, res) =>
  res.send(JSON.stringify(state.tasks))
);

app.post('/tasks', ({body}, res) =>
  res.send(JSON.stringify(state.add(body)))
);

app.delete('/tasks/:id', (req, res) => {
  res.send(JSON.stringify(state.remove(req.params.id)));
});

app.listen(8000, () => console.log('listening on localhost:8000'));
