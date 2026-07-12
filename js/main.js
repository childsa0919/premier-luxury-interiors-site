(function () {
  "use strict";

  var win = window;
  var doc = document;
  var EMAIL = "info@premierluxuryinteriors.com";
  var PHONE = "+13016641538";
  var FORM_STEPS = 4;
  var motionQuery = win.matchMedia("(prefers-reduced-motion: reduce)");

  function ready(callback) {
    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  function track(eventName, details) {
    win.dataLayer = win.dataLayer || [];
    var eventData = Object.assign(
      {
        event: eventName,
        event_timestamp: new Date().toISOString()
      },
      details || {}
    );
    win.dataLayer.push(eventData);
  }

  function getAttribution() {
    var params = new URLSearchParams(win.location.search);
    var attribution = {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
      gclid: "",
      fbclid: "",
      landing_page: win.location.pathname + win.location.search,
      referrer: doc.referrer || ""
    };

    params.forEach(function (value, key) {
      var normalizedKey = key.toLowerCase();
      if (normalizedKey.indexOf("utm_") === 0 || normalizedKey === "gclid" || normalizedKey === "fbclid") {
        attribution[normalizedKey] = value;
      }
    });

    return attribution;
  }

  function configureGlobalTracking() {
    doc.addEventListener("click", function (event) {
      var tracked = event.target.closest("[data-track]");
      if (tracked) {
        track(tracked.getAttribute("data-track"), {
          placement: tracked.getAttribute("data-placement") || "unspecified"
        });
        return;
      }

      var link = event.target.closest("a[href]");
      if (!link) return;
      var href = link.getAttribute("href") || "";
      if (href.indexOf("tel:") === 0) {
        track("call_click", { placement: inferPlacement(link) });
      } else if (href.indexOf("mailto:") === 0) {
        track("email_click", { placement: inferPlacement(link) });
      } else if (href === "#inquiry") {
        track("consultation_cta_click", { placement: inferPlacement(link) });
      }
    });
  }

  function inferPlacement(element) {
    if (element.closest(".site-header")) return "header";
    if (element.closest(".hero-stage")) return "hero";
    if (element.closest(".mobile-menu")) return "mobile_menu";
    if (element.closest(".mobile-dock")) return "mobile_dock";
    if (element.closest(".site-footer")) return "footer";
    if (element.closest(".closing")) return "closing";
    if (element.closest(".inquiry")) return "inquiry";
    return "page";
  }

  function configureHeroAndHeader() {
    var header = doc.querySelector("[data-site-header], .site-header");
    var hero = doc.querySelector("[data-hero], .hero-stage");
    var frame = 0;

    function setHeroDefaults() {
      if (!hero) return;
      hero.style.setProperty("--hero-progress", "0");
      hero.style.setProperty("--hero-top", "14vh");
      hero.style.setProperty("--hero-right", "4vw");
      hero.style.setProperty("--hero-bottom", "8vh");
      hero.style.setProperty("--hero-left", "54vw");
      hero.style.setProperty("--hero-radius", "24rem");
      hero.style.setProperty("--hero-scale", "1.080");
      hero.style.setProperty("--hero-copy-opacity", "1");
      hero.style.setProperty("--hero-copy-y", "0px");
    }

    function update() {
      frame = 0;
      var scrollY = win.scrollY || win.pageYOffset || 0;
      if (header) header.classList.toggle("site-header--solid", scrollY > 48);
      if (!hero || motionQuery.matches) return;

      var start = hero.offsetTop;
      var range = Math.max(hero.offsetHeight - win.innerHeight, 1);
      var progress = Math.min(1, Math.max(0, (scrollY - start) / range));
      var inverse = 1 - progress;

      hero.style.setProperty("--hero-progress", progress.toFixed(3));
      hero.style.setProperty("--hero-top", (inverse * 14).toFixed(2) + "vh");
      hero.style.setProperty("--hero-right", (inverse * 4).toFixed(2) + "vw");
      hero.style.setProperty("--hero-bottom", (inverse * 8).toFixed(2) + "vh");
      hero.style.setProperty("--hero-left", (inverse * 54).toFixed(2) + "vw");
      hero.style.setProperty("--hero-radius", (inverse * 24).toFixed(2) + "rem");
      hero.style.setProperty("--hero-scale", (1 + inverse * 0.08).toFixed(3));
      hero.style.setProperty("--hero-copy-opacity", Math.max(0, 1 - progress * 1.65).toFixed(3));
      hero.style.setProperty("--hero-copy-y", (-progress * 70).toFixed(1) + "px");
    }

    function requestUpdate() {
      if (!frame) frame = win.requestAnimationFrame(update);
    }

    setHeroDefaults();
    requestUpdate();
    win.addEventListener("scroll", requestUpdate, { passive: true });
    win.addEventListener("resize", requestUpdate, { passive: true });
    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", requestUpdate);
    }
  }

  function configureMobileMenu() {
    var button = doc.querySelector("[data-menu-toggle], .menu-toggle");
    var menu = doc.querySelector("[data-mobile-menu], #mobile-menu");
    if (!button || !menu) return;

    var label = button.querySelector("[data-menu-label], span");
    var previouslyFocused = null;
    var isOpen = false;
    var desktopQuery = win.matchMedia("(min-width: 901px)");

    function focusableElements() {
      return Array.prototype.slice.call(
        menu.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter(function (element) {
        return !element.hidden && element.getAttribute("aria-hidden") !== "true";
      });
    }

    function openMenu() {
      if (isOpen) return;
      isOpen = true;
      previouslyFocused = doc.activeElement;
      doc.body.classList.add("menu-is-open");
      menu.classList.add("mobile-menu--open");
      menu.setAttribute("aria-hidden", "false");
      menu.removeAttribute("inert");
      button.setAttribute("aria-expanded", "true");
      if (label) label.textContent = "Close";
      track("menu_open");
      win.requestAnimationFrame(function () {
        var items = focusableElements();
        if (items[0]) items[0].focus();
      });
    }

    function closeMenu(restoreFocus) {
      if (!isOpen) return;
      isOpen = false;
      doc.body.classList.remove("menu-is-open");
      menu.classList.remove("mobile-menu--open");
      menu.setAttribute("aria-hidden", "true");
      menu.setAttribute("inert", "");
      button.setAttribute("aria-expanded", "false");
      if (label) label.textContent = "Menu";
      track("menu_close");
      if (restoreFocus !== false) {
        var target = previouslyFocused && doc.contains(previouslyFocused) ? previouslyFocused : button;
        target.focus();
      }
    }

    menu.setAttribute("inert", "");
    button.addEventListener("click", function () {
      if (isOpen) closeMenu(true);
      else openMenu();
    });

    menu.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key !== "Tab") return;
      var items = focusableElements();
      if (!items.length) {
        event.preventDefault();
        button.focus();
        return;
      }
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    menu.querySelectorAll("[data-menu-link], a[href^='#']").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu(false);
      });
    });

    function closeAtDesktop(event) {
      if (event.matches) closeMenu(false);
    }
    if (typeof desktopQuery.addEventListener === "function") desktopQuery.addEventListener("change", closeAtDesktop);
  }

  function configureReveals() {
    var elements = Array.prototype.slice.call(doc.querySelectorAll("[data-reveal]"));
    if (!elements.length) return;
    if (motionQuery.matches || !("IntersectionObserver" in win)) {
      elements.forEach(function (element) {
        element.setAttribute("data-visible", "true");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-visible", "true");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14 }
    );
    elements.forEach(function (element) {
      observer.observe(element);
    });
  }

  function configureDossier() {
    var chapters = Array.prototype.slice.call(doc.querySelectorAll("[data-chapter]"));
    if (!chapters.length) return;
    var indexLabel = doc.querySelector("[data-chapter-index], .dossier__index span:first-child");
    var progressBar = doc.querySelector("[data-chapter-progress], .dossier__index b");
    var ratios = new Map();
    var activeIndex = -1;

    function activate(index) {
      index = Math.max(0, Math.min(chapters.length - 1, index));
      if (index === activeIndex) return;
      activeIndex = index;
      chapters.forEach(function (chapter, chapterIndex) {
        chapter.classList.toggle("is-active", chapterIndex === index);
        if (chapterIndex === index) chapter.setAttribute("aria-current", "true");
        else chapter.removeAttribute("aria-current");
      });
      if (indexLabel) indexLabel.textContent = String(index + 1).padStart(2, "0");
      if (progressBar) progressBar.style.transform = "scaleX(" + ((index + 1) / chapters.length).toFixed(3) + ")";
    }

    activate(0);
    if (!("IntersectionObserver" in win)) {
      var frame = 0;
      function calculateNearest() {
        frame = 0;
        var targetY = win.innerHeight * 0.48;
        var nearestIndex = 0;
        var nearestDistance = Infinity;
        chapters.forEach(function (chapter, index) {
          var rect = chapter.getBoundingClientRect();
          var distance = Math.abs(rect.top + rect.height / 2 - targetY);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        });
        activate(nearestIndex);
      }
      win.addEventListener("scroll", function () {
        if (!frame) frame = win.requestAnimationFrame(calculateNearest);
      }, { passive: true });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        var bestIndex = activeIndex < 0 ? 0 : activeIndex;
        var bestRatio = -1;
        chapters.forEach(function (chapter, index) {
          var ratio = ratios.get(chapter) || 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = index;
          }
        });
        if (bestRatio > 0) activate(bestIndex);
      },
      { rootMargin: "-30% 0px -38% 0px", threshold: [0.15, 0.45, 0.8] }
    );
    chapters.forEach(function (chapter) {
      ratios.set(chapter, 0);
      observer.observe(chapter);
    });
  }

  function configureInquiryForm(attribution) {
    var form = doc.querySelector("[data-inquiry-form], #project-brief-form, .brief-card form");
    if (!form) return;
    var card = form.closest(".brief-card") || form.parentElement;
    var fieldsets = Array.prototype.slice.call(form.querySelectorAll("[data-form-step], fieldset")).slice(0, FORM_STEPS);
    if (fieldsets.length !== FORM_STEPS) return;

    var currentStep = 0;
    var formStarted = false;
    var pendingPayload = null;
    var errorElement = form.querySelector("[data-form-error]");
    var messageRegion = form.querySelector("[data-form-message], .form-message");
    var stateMessage = form.querySelector("[data-form-state-message]");
    var progress = form.querySelector("[data-form-progress], .brief-progress");
    var progressLabel = form.querySelector("[data-form-progress-label], .brief-progress span:last-of-type");
    var progressBar = form.querySelector("[data-form-progress-bar], .brief-progress b");
    var backButton = form.querySelector("[data-step-back], [data-form-back], .back-button");
    var nextButton = form.querySelector("[data-step-next], [data-form-next]");
    var submitButton = form.querySelector("[data-form-submit], button[type='submit']");
    var successState = card ? card.querySelector("[data-form-success]") : null;
    var submissionState = card ? card.querySelector("[data-submission-state]") : null;

    form.noValidate = true;
    ensureHoneypot(form);
    populateAttributionInputs(form, attribution);

    if (!errorElement) {
      errorElement = doc.createElement("p");
      errorElement.setAttribute("data-form-error", "");
      errorElement.hidden = true;
      if (!messageRegion) {
        messageRegion = doc.createElement("div");
        messageRegion.className = "form-message";
        messageRegion.setAttribute("data-form-message", "");
        messageRegion.setAttribute("aria-live", "polite");
        var actions = form.querySelector(".form-actions");
        form.insertBefore(messageRegion, actions || null);
      }
      messageRegion.appendChild(errorElement);
    }
    errorElement.id = errorElement.id || "project-brief-error";
    errorElement.setAttribute("role", "alert");
    form.setAttribute("aria-describedby", errorElement.id);

    function field(name) {
      return form.elements.namedItem(name);
    }

    function fieldValue(name) {
      var control = field(name);
      if (!control) return "";
      if (typeof RadioNodeList !== "undefined" && control instanceof RadioNodeList) return String(control.value || "").trim();
      if (control.type === "checkbox") return control.checked;
      return String(control.value || "").trim();
    }

    function controlsFor(name) {
      return Array.prototype.slice.call(form.querySelectorAll('[name="' + name + '"]'));
    }

    function clearError() {
      errorElement.textContent = "";
      errorElement.hidden = true;
    }

    function clearInvalid() {
      form.querySelectorAll('[aria-invalid="true"]').forEach(function (control) {
        control.removeAttribute("aria-invalid");
      });
    }

    function fail(message, name) {
      clearInvalid();
      errorElement.textContent = message;
      errorElement.hidden = false;
      var controls = controlsFor(name);
      controls.forEach(function (control) {
        control.setAttribute("aria-invalid", "true");
        control.setAttribute("aria-describedby", errorElement.id);
      });
      track("form_validation_error", { step: currentStep + 1, field: name });
      if (controls[0]) controls[0].focus();
      return false;
    }

    function validateStep(step) {
      clearError();
      clearInvalid();
      if (step === 0 && !fieldValue("projectType")) {
        return fail("Choose the room or scope you are considering.", "projectType");
      }
      if (step === 1) {
        if (fieldValue("location").length < 2) return fail("Add the property city, state, or ZIP code.", "location");
        if (!fieldValue("stage")) return fail("Choose where you are in the project process.", "stage");
        if (!fieldValue("timing")) return fail("Choose your desired project timing.", "timing");
      }
      if (step === 2) {
        if (!fieldValue("investmentReadiness")) return fail("Choose an investment-planning answer.", "investmentReadiness");
        if (fieldValue("goals").length < 20) return fail("Share at least 20 characters about what you want the room to change.", "goals");
      }
      if (step === 3) {
        if (!fieldValue("firstName")) return fail("Add your first name.", "firstName");
        if (!fieldValue("lastName")) return fail("Add your last name.", "lastName");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(fieldValue("email"))) return fail("Enter a valid email address.", "email");
        if (fieldValue("phone").replace(/\D/g, "").length < 10) return fail("Enter a complete phone number, including area code.", "phone");
        if (!fieldValue("consent")) return fail("Confirm that Premier Luxury Interiors may respond to your inquiry.", "consent");
      }
      return true;
    }

    function focusStepHeading() {
      var legend = fieldsets[currentStep].querySelector("legend");
      if (!legend) return;
      legend.setAttribute("tabindex", "-1");
      legend.focus();
    }

    function showStep(step, moveFocus) {
      currentStep = Math.max(0, Math.min(FORM_STEPS - 1, step));
      form.setAttribute("data-current-step", String(currentStep));
      fieldsets.forEach(function (fieldset, index) {
        var active = index === currentStep;
        fieldset.hidden = !active;
        fieldset.setAttribute("aria-hidden", active ? "false" : "true");
      });
      if (progress) progress.setAttribute("aria-label", "Step " + (currentStep + 1) + " of " + FORM_STEPS);
      if (progressLabel) progressLabel.textContent = String(currentStep + 1).padStart(2, "0") + " / 04";
      if (progressBar) progressBar.style.transform = "scaleX(" + ((currentStep + 1) / FORM_STEPS).toFixed(2) + ")";
      if (backButton) backButton.hidden = currentStep === 0;
      if (nextButton) nextButton.hidden = currentStep === FORM_STEPS - 1;
      if (submitButton) submitButton.hidden = currentStep !== FORM_STEPS - 1;
      clearError();
      if (moveFocus) win.requestAnimationFrame(focusStepHeading);
    }

    function updateChoices() {
      form.querySelectorAll(".choice input[type='radio']").forEach(function (radio) {
        var choice = radio.closest(".choice");
        if (choice) choice.classList.toggle("is-selected", radio.checked);
      });
    }

    function buildPayload() {
      var payload = {
        projectType: fieldValue("projectType"),
        location: fieldValue("location"),
        stage: fieldValue("stage"),
        timing: fieldValue("timing"),
        investmentReadiness: fieldValue("investmentReadiness"),
        goals: fieldValue("goals"),
        firstName: fieldValue("firstName"),
        lastName: fieldValue("lastName"),
        email: fieldValue("email"),
        phone: fieldValue("phone"),
        contactPreference: fieldValue("contactPreference") || "No preference",
        consent: Boolean(fieldValue("consent")),
        website: fieldValue("website"),
        source: "Premier Luxury Interiors website",
        submittedAt: new Date().toISOString(),
        attribution: Object.assign({}, attribution)
      };
      Object.keys(attribution).forEach(function (key) {
        payload[key] = attribution[key];
      });
      return payload;
    }

    function setSending(sending) {
      form.setAttribute("aria-busy", sending ? "true" : "false");
      form.setAttribute("data-form-state", sending ? "sending" : "draft");
      if (!submitButton) return;
      if (!submitButton.dataset.idleLabel) submitButton.dataset.idleLabel = submitButton.textContent.trim();
      submitButton.disabled = sending;
      submitButton.textContent = sending ? "Sending…" : submitButton.dataset.idleLabel;
    }

    function renderSuccess(payload) {
      setSending(false);
      form.hidden = true;
      if (submissionState) submissionState.hidden = true;
      if (!successState) {
        successState = doc.createElement("div");
        successState.className = "success-state";
        successState.setAttribute("data-form-success", "");
        successState.setAttribute("role", "status");
        successState.setAttribute("aria-live", "polite");
        card.appendChild(successState);
      }
      successState.hidden = false;
      var nameTarget = successState.querySelector("[data-success-name]");
      if (nameTarget) {
        nameTarget.textContent = payload.firstName;
      } else {
        successState.replaceChildren(
          makeElement("p", "eyebrow eyebrow--dark", "Inquiry received"),
          makeElement("h3", "", "Thank you, " + payload.firstName + "."),
          makeElement("p", "", "Your project brief is safely in. Premier Luxury Interiors can now begin with a clearer sense of the room, timing, and vision.")
        );
        var call = makeElement("a", "button button--dark", "Call the studio now");
        call.href = "tel:" + PHONE;
        successState.appendChild(call);
      }
      var heading = successState.querySelector("h3");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    }

    function renderEmailFallback(payload, mailto, endpointConfigured, detail) {
      setSending(false);
      form.hidden = true;
      if (successState) successState.hidden = true;
      if (!submissionState) {
        submissionState = doc.createElement("div");
        submissionState.setAttribute("data-submission-state", "");
        card.appendChild(submissionState);
      }
      submissionState.hidden = false;
      submissionState.className = "success-state email-fallback-state";
      submissionState.setAttribute("role", "status");
      submissionState.setAttribute("aria-live", "polite");
      submissionState.replaceChildren();

      var eyebrow = makeElement("p", "eyebrow eyebrow--dark", "Email handoff");
      var heading = makeElement("h3", "", "Your draft is ready.");
      var message = makeElement(
        "p",
        "",
        "An email draft opened—send it to complete your inquiry. The website has not marked your request as received."
      );
      if (detail) message.setAttribute("data-delivery-detail", detail);
      var actions = makeElement("div", "form-actions", "");
      var retry = makeElement("button", "back-button", endpointConfigured ? "Retry secure delivery" : "Return to form");
      retry.type = "button";
      retry.setAttribute("data-retry-submit", "");
      var reopen = makeElement("a", "button button--dark", "Reopen email draft");
      reopen.href = mailto;
      reopen.setAttribute("data-reopen-draft", "");
      reopen.addEventListener("click", function () {
        track("form_email_draft_reopen", { projectType: payload.projectType });
      });

      retry.addEventListener("click", function () {
        if (!endpointConfigured) {
          submissionState.hidden = true;
          form.hidden = false;
          showStep(3, false);
          if (submitButton) submitButton.focus();
          track("form_return_to_draft");
          return;
        }
        retry.disabled = true;
        retry.textContent = "Trying…";
        attemptDelivery(payload, false);
      });

      actions.appendChild(retry);
      actions.appendChild(reopen);
      submissionState.appendChild(eyebrow);
      submissionState.appendChild(heading);
      submissionState.appendChild(message);
      submissionState.appendChild(actions);
      heading.setAttribute("tabindex", "-1");
      heading.focus();
    }

    function attemptDelivery(payload, openDraftOnFailure) {
      pendingPayload = payload;
      var endpoint = getWebhookEndpoint();
      var mailto = buildMailto(payload);
      if (!endpoint) {
        track("form_submit_fallback", { reason: "webhook_not_configured", projectType: payload.projectType });
        renderEmailFallback(payload, mailto, false, "webhook_not_configured");
        if (openDraftOnFailure) openEmailDraft(mailto);
        return;
      }

      setSending(true);
      postJson(endpoint, payload)
        .then(function () {
          renderSuccess(payload);
          track("form_submit", {
            method: "highlevel_webhook",
            projectType: payload.projectType,
            timing: payload.timing
          });
        })
        .catch(function (error) {
          track("form_submit_fallback", {
            reason: error && error.name === "AbortError" ? "webhook_timeout" : "webhook_failed",
            projectType: payload.projectType
          });
          renderEmailFallback(payload, mailto, true, "webhook_failed");
          if (openDraftOnFailure) openEmailDraft(mailto);
        });
    }

    if (backButton) {
      backButton.addEventListener("click", function () {
        showStep(currentStep - 1, true);
        track("form_step_back", { step: currentStep + 1 });
      });
    }
    if (nextButton) {
      nextButton.addEventListener("click", function () {
        if (!validateStep(currentStep)) return;
        track("form_step", { step: currentStep + 1, next_step: currentStep + 2 });
        showStep(currentStep + 1, true);
      });
    }

    form.addEventListener("focusin", function () {
      if (formStarted) return;
      formStarted = true;
      track("form_start");
    });

    form.addEventListener("input", function (event) {
      if (event.target.matches("input, select, textarea")) {
        event.target.removeAttribute("aria-invalid");
        clearError();
      }
    });
    form.addEventListener("change", updateChoices);

    form.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" || currentStep === FORM_STEPS - 1 || event.target.tagName === "TEXTAREA") return;
      if (event.target.tagName === "BUTTON") return;
      event.preventDefault();
      if (nextButton) nextButton.click();
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (fieldValue("website")) {
        track("form_honeypot_blocked");
        fail("We could not process this request. Clear the website field and try again.", "website");
        return;
      }
      for (var step = 0; step < FORM_STEPS; step += 1) {
        showStep(step, false);
        if (!validateStep(step)) {
          return;
        }
      }
      currentStep = FORM_STEPS - 1;
      pendingPayload = buildPayload();
      track("form_submit_attempt", {
        projectType: pendingPayload.projectType,
        timing: pendingPayload.timing
      });
      attemptDelivery(pendingPayload, true);
    });

    updateChoices();
    showStep(0, false);

    // Expose a narrow retry hook for consented CRM integrations and diagnostics.
    form.retryPendingSubmission = function () {
      if (pendingPayload) attemptDelivery(pendingPayload, false);
    };
  }

  function ensureHoneypot(form) {
    if (form.elements.namedItem("website")) return;
    var label = doc.createElement("label");
    label.className = "honeypot";
    label.setAttribute("aria-hidden", "true");
    label.textContent = "Website";
    var input = doc.createElement("input");
    input.type = "text";
    input.name = "website";
    input.tabIndex = -1;
    input.autocomplete = "off";
    label.appendChild(input);
    form.appendChild(label);
  }

  function populateAttributionInputs(form, attribution) {
    form.querySelectorAll("[data-attribution]").forEach(function (input) {
      var key = input.getAttribute("data-attribution");
      input.value = attribution[key] || "";
    });
  }

  function getWebhookEndpoint() {
    var configured = typeof win.PLI_HIGHLEVEL_WEBHOOK === "string" ? win.PLI_HIGHLEVEL_WEBHOOK.trim() : "";
    if (!configured) {
      var meta = doc.querySelector("meta[data-highlevel-webhook], meta[name='pli-highlevel-webhook']");
      if (meta) configured = (meta.getAttribute("data-highlevel-webhook") || meta.getAttribute("content") || "").trim();
    }
    if (!configured) return "";
    try {
      var parsed = new URL(configured, win.location.href);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
      return parsed.href;
    } catch (error) {
      return "";
    }
  }

  function postJson(endpoint, payload) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? win.setTimeout(function () { controller.abort(); }, 12000) : 0;
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*"
      },
      body: JSON.stringify(payload),
      credentials: "omit",
      mode: "cors",
      redirect: "follow",
      referrerPolicy: "strict-origin-when-cross-origin",
      keepalive: true,
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (timer) win.clearTimeout(timer);
      if (!response.ok) throw new Error("HighLevel returned HTTP " + response.status);
      var contentType = response.headers.get("content-type") || "";
      if (contentType.toLowerCase().indexOf("application/json") === -1) {
        throw new Error("HighLevel did not return JSON confirmation");
      }
      return response.json().then(function (confirmation) {
        if (!confirmation || confirmation.ok !== true) {
          throw new Error("HighLevel did not confirm receipt");
        }
        return confirmation;
      });
    }, function (error) {
      if (timer) win.clearTimeout(timer);
      throw error;
    });
  }

  function buildMailto(payload) {
    var subject = "Private consultation request — " + payload.projectType + " — " + payload.firstName + " " + payload.lastName;
    var attribution = payload.attribution || {};
    var lines = [
      "PREMIER LUXURY INTERIORS — WEBSITE INQUIRY",
      "",
      "CONTACT",
      "Name: " + payload.firstName + " " + payload.lastName,
      "Email: " + payload.email,
      "Phone: " + payload.phone,
      "Preferred contact: " + payload.contactPreference,
      "",
      "PROJECT",
      "Scope: " + payload.projectType,
      "Property location: " + payload.location,
      "Project stage: " + payload.stage,
      "Desired timing: " + payload.timing,
      "Investment planning: " + payload.investmentReadiness,
      "",
      "GOALS",
      payload.goals,
      "",
      "ATTRIBUTION",
      "Landing page: " + (attribution.landing_page || ""),
      "Referrer: " + (attribution.referrer || ""),
      "UTM source: " + (attribution.utm_source || ""),
      "UTM medium: " + (attribution.utm_medium || ""),
      "UTM campaign: " + (attribution.utm_campaign || ""),
      "GCLID: " + (attribution.gclid || ""),
      "FBCLID: " + (attribution.fbclid || ""),
      "",
      "Consent to respond: Yes"
    ];
    return "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function openEmailDraft(mailto) {
    win.setTimeout(function () {
      win.location.href = mailto;
    }, 0);
  }

  function makeElement(tagName, className, text) {
    var element = doc.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  ready(function () {
    var attribution = getAttribution();
    var year = doc.querySelector("[data-current-year]");
    if (year) year.textContent = String(new Date().getFullYear());
    configureGlobalTracking();
    configureHeroAndHeader();
    configureMobileMenu();
    configureReveals();
    configureDossier();
    configureInquiryForm(attribution);
    track("page_ready", {
      page_path: win.location.pathname,
      utm_source: attribution.utm_source,
      utm_campaign: attribution.utm_campaign
    });
  });
})();
