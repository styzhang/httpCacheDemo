const timerEl = document.getElementById('timer');

const date = new Date();

function loopTime () {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let hour = date.getHours();
  hour = hour < 10 ? '0' + hour : hour;
  let minute = date.getMinutes();
  minute = minute < 10 ? '0' + minute : minute;
  let second = date.getSeconds();
  second = second < 10 ? '0' + second : second;
  const text = year + "-" + month + "-" + day + " "  + hour + ":" + minute + ":" + second;
  timerEl.textContent = text;
  setTimeout(function () {
    date.setSeconds(second + 1);
    loopTime();
  }, 1000);
}

loopTime();