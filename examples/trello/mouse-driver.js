import xs from 'xstream';

function fromEvent (element, eventName) {
  const event$ = xs.create();
  element.addEventListener(eventName, ev => event$.shamefullySendNext(ev));
  return event$;
}

export default function mouseDriver () {
  return {
    positions () {
      return fromEvent(document, 'mousemove')
        .map(ev => {
          return {x: ev.clientX, y: ev.clientY};
        }).startWith({x: window.innerWidth / 2, y: window.innerHeight / 2});
    },
    
    relativePositions (element$) {
    }

    up$: fromEvent(document, 'mouseup')

  };
}
