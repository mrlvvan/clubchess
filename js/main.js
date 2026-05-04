(function () {
  "use strict";

  var PHRASES = [
    "Дело помощи утопающим — дело рук самих утопающих!",
    "Шахматы двигают вперёд не только культуру, но и экономику!",
    "Лёд тронулся, господа присяжные заседатели!",
  ];

  function buildSequenceFragment() {
    var frag = document.createDocumentFragment();
    var seq = document.createElement("div");
    seq.className = "ticker__sequence";

    for (var i = 0; i < PHRASES.length; i++) {
      var span = document.createElement("span");
      span.className = "ticker__text";
      span.textContent = PHRASES[i];
      seq.appendChild(span);

      var dot = document.createElement("span");
      dot.className = "ticker__dot";
      dot.setAttribute("aria-hidden", "true");
      seq.appendChild(dot);
    }

    frag.appendChild(seq);
    return frag;
  }

  function fillTrack(track) {
    track.innerHTML = "";
    track.appendChild(buildSequenceFragment());
    track.appendChild(buildSequenceFragment());
  }

  function initTickers() {
    var tracks = document.querySelectorAll("[data-ticker-track]");
    tracks.forEach(function (track) {
      fillTrack(track);
    });
  }

  var MQ_NARROW = window.matchMedia("(max-width: 375px)");

  function isNarrow() {
    return MQ_NARROW.matches;
  }

  function getVisible() {
    return isNarrow() ? 1 : 3;
  }

  function initParticipants() {
    var viewport = document.querySelector("[data-participants-viewport]");
    var track = document.querySelector("[data-participants-track]");
    var counterEl = document.querySelector("[data-participants-counter]");
    if (!track || !viewport) {
      return;
    }

    var orig = track.querySelectorAll("[data-participant]:not([data-participant-clone])");
    var total = orig.length;
    if (total === 0) {
      return;
    }

    var lastSlide;
    var slideIndex;

    function clearClones() {
      var clones = track.querySelectorAll("[data-participant-clone]");
      for (var c = 0; c < clones.length; c++) {
        clones[c].remove();
      }
    }

    function appendClones(vis) {
      for (var ci = 0; ci < vis; ci++) {
        if (ci < orig.length) {
          var cl = orig[ci].cloneNode(true);
          cl.removeAttribute("data-participant");
          cl.setAttribute("data-participant-clone", "true");
          cl.setAttribute("aria-hidden", "true");
          var lks = cl.querySelectorAll("a, button");
          for (var li = 0; li < lks.length; li++) {
            lks[li].setAttribute("tabindex", "-1");
          }
          track.appendChild(cl);
        }
      }
    }

    function recomputeStateFromSlide() {
      lastSlide = total;
    }

    function rebuildForViewport() {
      stopAuto();
      var k = (slideIndex % total + total) % total;
      clearClones();
      appendClones(getVisible());
      recomputeStateFromSlide();
      slideIndex = k;
      window.requestAnimationFrame(function () {
        updateTrack(false);
        setCounter();
        if (!isNarrow()) {
          startAuto();
        }
      });
    }

    clearClones();
    appendClones(getVisible());
    recomputeStateFromSlide();
    slideIndex = isNarrow() ? 0 : 2;

    if (MQ_NARROW.addEventListener) {
      MQ_NARROW.addEventListener("change", rebuildForViewport);
    } else if (MQ_NARROW.addListener) {
      MQ_NARROW.addListener(rebuildForViewport);
    }
    var intervalId = null;
    var startX = 0;
    var activePointer = null;
    var pointerMoved = false;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var suppressClickUntil = 0;
    var prevBtn = document.querySelector(".participants__btn--prev");
    var nextBtn = document.querySelector(".participants__btn--next");

    function getGap() {
      var g = window.getComputedStyle(track).columnGap;
      if (g && g !== "normal") {
        return parseFloat(g) || 20;
      }
      g = window.getComputedStyle(track).gap;
      if (g && g !== "normal") {
        return parseFloat(g) || 20;
      }
      return 20;
    }

    function getStep() {
      var el = track.querySelector(".participant-card");
      if (!el) {
        return 0;
      }
      return el.offsetWidth + getGap();
    }

    function updateTrack(allowT) {
      if (allowT === false) {
        track.style.transition = "none";
      } else if (reduceMotion) {
        track.style.transition = "none";
      } else {
        track.style.removeProperty("transition");
      }
      var s = getStep();
      if (s === 0) {
        return;
      }
      var x = -slideIndex * s;
      track.style.transform = "translate3d(" + x + "px, 0, 0)";
    }

    function setCounter() {
      if (!counterEl) {
        return;
      }
      if (total === 0) {
        return;
      }
      var n = (slideIndex % total) + 1;
      counterEl.textContent = n + " / " + total;
    }

    function goNext() {
      var s = getStep();
      if (s === 0) {
        return;
      }
      if (slideIndex < lastSlide) {
        slideIndex += 1;
        updateTrack(true);
        setCounter();
        return;
      }
      track.style.transition = "none";
      slideIndex = 0;
      updateTrack(false);
      void track.offsetWidth;
      if (!reduceMotion) {
        track.style.removeProperty("transition");
      }
      setCounter();
    }

    function goPrev() {
      var s = getStep();
      if (s === 0) {
        return;
      }
      if (slideIndex > 0) {
        slideIndex -= 1;
        updateTrack(true);
        setCounter();
        return;
      }
      track.style.transition = "none";
      slideIndex = lastSlide - 1;
      updateTrack(false);
      void track.offsetWidth;
      if (!reduceMotion) {
        track.style.removeProperty("transition");
      }
      setCounter();
    }

    function stopAuto() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }

    var autoStartAttempts = 0;
    var autoStartMaxAttempts = 50;

    function startAuto() {
      stopAuto();
      if (isNarrow()) {
        return;
      }
      if (lastSlide < 1) {
        return;
      }
      if (getStep() === 0) {
        if (autoStartAttempts < autoStartMaxAttempts) {
          autoStartAttempts += 1;
          window.requestAnimationFrame(function () {
            startAuto();
          });
        }
        return;
      }
      autoStartAttempts = 0;
      intervalId = window.setInterval(function () {
        goNext();
      }, 4000);
    }

    function restartAuto() {
      startAuto();
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goPrev();
        restartAuto();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goNext();
        restartAuto();
      });
    }

    function onResize() {
      updateTrack();
    }

    viewport.addEventListener(
      "click",
      function (e) {
        if (Date.now() < suppressClickUntil) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );

    viewport.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) {
        return;
      }
      startX = e.clientX;
      pointerMoved = false;
      activePointer = e.pointerId;
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch (err) {
        activePointer = null;
        return;
      }
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", function (e) {
      if (e.pointerId !== activePointer) {
        return;
      }
      if (Math.abs(e.clientX - startX) > 8) {
        pointerMoved = true;
      }
    });

    viewport.addEventListener("pointerup", function (e) {
      if (e.pointerId !== activePointer) {
        return;
      }
      activePointer = null;
      viewport.classList.remove("is-dragging");
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (err) {}
      if (!pointerMoved) {
        return;
      }
      var dx = e.clientX - startX;
      if (Math.abs(dx) < 50) {
        return;
      }
      if (getStep() === 0) {
        return;
      }
      suppressClickUntil = Date.now() + 500;
      if (dx < 0) {
        goNext();
      } else {
        goPrev();
      }
      restartAuto();
    });

    viewport.addEventListener("pointercancel", function (e) {
      if (e.pointerId === activePointer) {
        activePointer = null;
        pointerMoved = false;
        viewport.classList.remove("is-dragging");
      }
    });

    function firstLayout() {
      updateTrack();
      setCounter();
    }

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        firstLayout();
        startAuto();
      });
    });

    window.addEventListener("resize", onResize);

    if (window.ResizeObserver) {
      var ro = new window.ResizeObserver(function () {
        onResize();
        if (intervalId === null && getStep() > 0 && !isNarrow()) {
          autoStartAttempts = 0;
          startAuto();
        }
      });
      ro.observe(viewport);
    }
  }

  function initStages() {
    var narrowMq = window.matchMedia("(max-width: 375px)");
    var viewport = document.querySelector(".stages__viewport--sheet");
    var prevBtn = document.querySelector("[data-stages-prev]");
    var nextBtn = document.querySelector("[data-stages-next]");
    var dotButtons = document.querySelectorAll("[data-stages-dot]");
    var desktop = document.querySelector(".stages__desktop");
    var mobile = document.querySelector(".stages__mobile");

    if (!viewport) {
      return;
    }
    var list = viewport.querySelector(".stages__slider");
    if (!list) {
      return;
    }
    var slides = list.querySelectorAll(".stages__slide");
    var total = slides.length;
    if (total < 1) {
      return;
    }

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function setStagesAria() {
      var n = narrowMq.matches;
      if (desktop) {
        desktop.setAttribute("aria-hidden", n ? "true" : "false");
      }
      if (mobile) {
        mobile.setAttribute("aria-hidden", n ? "false" : "true");
      }
    }

    function stepSize() {
      return viewport.clientWidth;
    }

    function getIndex() {
      var step = stepSize();
      if (step < 1) {
        return 0;
      }
      return Math.round(viewport.scrollLeft / step);
    }

    function setNav() {
      var i = getIndex();
      if (i < 0) {
        i = 0;
      }
      if (i >= total) {
        i = total - 1;
      }
      var isFirst = i <= 0;
      var isLast = i >= total - 1;
      if (prevBtn) {
        prevBtn.disabled = isFirst;
        prevBtn.setAttribute("aria-disabled", isFirst ? "true" : "false");
      }
      if (nextBtn) {
        nextBtn.disabled = isLast;
        nextBtn.setAttribute("aria-disabled", isLast ? "true" : "false");
      }
      for (var d = 0; d < dotButtons.length; d++) {
        var dot = dotButtons[d];
        var di = parseInt(dot.getAttribute("data-index") || String(d), 10);
        if (di === i) {
          dot.classList.add("stages__dot--active");
          dot.setAttribute("aria-current", "true");
        } else {
          dot.classList.remove("stages__dot--active");
          dot.removeAttribute("aria-current");
        }
      }
    }

    function goToIndex(nextI) {
      var step = stepSize();
      if (step < 1) {
        return;
      }
      if (nextI < 0) {
        nextI = 0;
      }
      if (nextI >= total) {
        nextI = total - 1;
      }
      viewport.scrollTo({
        left: nextI * step,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }

    function go(dir) {
      goToIndex(getIndex() + dir);
    }

    setStagesAria();
    if (narrowMq.addEventListener) {
      narrowMq.addEventListener("change", setStagesAria);
    } else if (narrowMq.addListener) {
      narrowMq.addListener(setStagesAria);
    }

    viewport.addEventListener(
      "scroll",
      function () {
        setNav();
      },
      { passive: true }
    );
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        go(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        go(1);
      });
    }
    for (var di = 0; di < dotButtons.length; di++) {
      (function (idx) {
        dotButtons[idx].addEventListener("click", function () {
          var target = parseInt(
            dotButtons[idx].getAttribute("data-index") || String(idx),
            10
          );
          goToIndex(target);
        });
      })(di);
    }
    function onVResize() {
      setNav();
    }
    window.addEventListener("resize", onVResize);
    if (window.ResizeObserver) {
      var ro2 = new window.ResizeObserver(onVResize);
      ro2.observe(viewport);
    }
    window.requestAnimationFrame(function () {
      setNav();
    });
  }

  function initScrollReveal() {
    var targets = document.querySelectorAll(".reveal, .reveal--split");
    if (!targets.length) {
      return;
    }
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("js-reveal");
    if (reduceMotion) {
      for (var i = 0; i < targets.length; i++) {
        targets[i].classList.add("is-revealed");
      }
      return;
    }
    var obs = new IntersectionObserver(
      function (entries, observer) {
        for (var j = 0; j < entries.length; j++) {
          var entry = entries[j];
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      {
        root: null,
        rootMargin: "0px 0px -7% 0px",
        threshold: 0.06,
      }
    );
    for (var k = 0; k < targets.length; k++) {
      obs.observe(targets[k]);
    }
  }

  function run() {
    initTickers();
    initParticipants();
    initStages();
    initScrollReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
