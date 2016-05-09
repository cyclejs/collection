# cycle-hot-reloading-example
A Cycle.js starter project with hot reloading using browserify and browserify-hmr.

Usage
---

To get set up:

```bash
git clone https://github.com/Widdershin/cycle-hot-reloading-example.git
cd cycle-hot-reloading-example
npm install
npm start
```

You should then be able to visit localhost:8000 and you'll see the text 'Change me!'.

You can then go into `src/app.js` and change that text, and you should see the result straight away without the page reloading.

You can also change the styles in `styles.css` and it will live reload.

This is made possible by [AgentME/browserify-hmr](http://www.github.com/AgentME/browserify-hmr), along with mattdesl's excellent [budo](http://www.github.com/mattdesl/budo) development server. All of the hot reloading configuration is done in `index.js`. The key part is that the old Cycle application is diposed every time the code changes.


Deployment
---

To get your project online, if you don't need a backend server, you can deploy to Github pages.

Note: if you cloned this repo directly, you will first need to [create a new repo](https://github.com/new). Since you're uploading an existing repo, don't add a README, license or .gitignore. Then follow the instructions to add your new repo as the remote. You will need to `git remote rm origin` beforehand.

To deploy for the first time, we need to set up a `gh-pages` branch:

```bash
git checkout -b gh-pages
npm run bundle
git add .
git commit -m "Add bundled app"
git push origin gh-pages
```

Then visit http://**username**.github.io/**repository**. Your site should be online within 5 minutes or so.

To update your site in future, just checkout back to the branch and repeat the process:
```bash
git checkout gh-pages
git merge master --no-edit
npm run bundle
git add .
git commit -m "Update bundle"
git push origin gh-pages
```

