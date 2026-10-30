/* =========================================================
   JAY CHRISTIAN BACCAY
   PORTFOLIO — CUSTOM JAVASCRIPT
   Smooth • Responsive • Bug-Safe
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* BODY READY */
  document.body.classList.add("js-ready");

  /* REDUCED MOTION */
  const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* NAVBAR — CLOSE MOBILE MENU AFTER CLICK */
  const navMenu = document.getElementById("navMenu");
  const navLinks = document.querySelectorAll(".nav-link");
  const navbarToggler = document.querySelector(".navbar-toggler");

  if (navMenu && navLinks.length) {
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (
          window.innerWidth < 768 &&
          navMenu.classList.contains("show") &&
          navbarToggler
        ) {
          navbarToggler.click();
        }
      });
    });
  }

  /* SCROLL REVEAL */
  const revealElements = document.querySelectorAll([
    ".about-card",
    ".skill-row",
    ".timeline-item",
    ".design-card",
    ".project-card",
    ".contact-links"
  ].join(", "));

  if (revealElements.length) {
    revealElements.forEach((element) => {
      element.classList.add("reveal");
    });

    if (prefersReducedMotion) {
      revealElements.forEach((element) => {
        element.classList.add("visible");
      });
    } else if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -40px 0px"
        }
      );

      revealElements.forEach((element) => {
        revealObserver.observe(element);
      });
    } else {
      revealElements.forEach((element) => {
        element.classList.add("visible");
      });
    }
  }

  /* DESIGN CARDS — 3D MOUSE TILT */
  const designCards = document.querySelectorAll(".design-card");

  if (!prefersReducedMotion) {
    designCards.forEach((card) => {
      let tiltFrame = null;

      card.addEventListener("mousemove", (event) => {
        if (window.innerWidth < 768) return;

        if (tiltFrame) {
          cancelAnimationFrame(tiltFrame);
        }

        tiltFrame = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();

          if (!rect.width || !rect.height) return;

          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;

          const rotateY = (x - 0.5) * 12;
          const rotateX = (0.5 - y) * 12;

          card.style.setProperty("--rx", `${rotateX.toFixed(2)}deg`);
          card.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
        });
      });

      card.addEventListener("mouseleave", () => {
        if (tiltFrame) {
          cancelAnimationFrame(tiltFrame);
          tiltFrame = null;
        }

        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* FLOATING TECH ELEMENTS
     HTML / CSS / JS / CODE
     Animation is handled ONLY by CSS.
  */

  /* SKILL ROW HOVER EFFECT */
  const skillRows = document.querySelectorAll(".skill-row");

  skillRows.forEach((row) => {
    row.addEventListener("mouseenter", () => {
      row.classList.add("skill-active");
    });

    row.addEventListener("mouseleave", () => {
      row.classList.remove("skill-active");
    });
  });

  /* ACTIVE NAVIGATION */
  const sections = document.querySelectorAll("section[id]");
  const navigationLinks = document.querySelectorAll(".nav-link");

  if (
    sections.length &&
    navigationLinks.length &&
    "IntersectionObserver" in window
  ) {
    const sectionObserver = new IntersectionObserver(() => {
      const visibleSections = [...sections].filter((section) => {
        const rect = section.getBoundingClientRect();

        return (
          rect.top < window.innerHeight * 0.55 &&
          rect.bottom > window.innerHeight * 0.25
        );
      });

      if (!visibleSections.length) return;

      const currentSection = visibleSections.reduce((closest, section) => {
        const closestDistance = Math.abs(
          closest.getBoundingClientRect().top
        );

        const currentDistance = Math.abs(
          section.getBoundingClientRect().top
        );

        return currentDistance < closestDistance ? section : closest;
      });

      const currentId = currentSection.getAttribute("id");

      navigationLinks.forEach((link) => {
        const href = link.getAttribute("href");

        link.classList.toggle("active", href === `#${currentId}`);
      });
    }, {
      rootMargin: "-25% 0px -55% 0px",
      threshold: [0, 0.1, 0.25, 0.5]
    });

    sections.forEach((section) => {
      sectionObserver.observe(section);
    });
  }

  /* SMOOTH SCROLL */
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      let target = null;

      try {
        target = document.querySelector(targetId);
      } catch (error) {
        console.warn("Invalid anchor target:", targetId);
        return;
      }

      if (!target) return;

      event.preventDefault();

      const navbar = document.querySelector(".navbar");
      const navbarHeight = navbar ? navbar.offsetHeight : 0;
      const extraSpacing = 12;

      const targetPosition =
        target.getBoundingClientRect().top +
        window.scrollY -
        navbarHeight -
        extraSpacing;

      window.scrollTo({
        top: Math.max(0, targetPosition),
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });

      if (window.history && window.history.replaceState) {
        try {
          window.history.replaceState(null, "", targetId);
        } catch (error) {
          /* Ignore history errors */
        }
      }
    });
  });

  /* NAVBAR SHADOW ON SCROLL */
  const navbar = document.querySelector(".navbar");

  if (navbar) {
    let navbarTicking = false;

    const updateNavbar = () => {
      navbar.classList.toggle("scrolled", window.scrollY > 20);
      navbarTicking = false;
    };

    window.addEventListener("scroll", () => {
      if (!navbarTicking) {
        window.requestAnimationFrame(updateNavbar);
        navbarTicking = true;
      }
    }, {
      passive: true
    });

    updateNavbar();
  }

  /* DESIGN IMAGE — EXPAND INSIDE CARD */
  const designImages = document.querySelectorAll(".design-image-wrapper");

  designImages.forEach((wrapper) => {
    const icon = wrapper.querySelector(".image-zoom-icon i");

    const closeButton = document.createElement("button");

    closeButton.type = "button";
    closeButton.className = "design-close-btn";
    closeButton.setAttribute("aria-label", "Close expanded image");
    closeButton.innerHTML = "&times;";

    wrapper.appendChild(closeButton);

    wrapper.addEventListener("click", (event) => {
      if (
        event.target === closeButton ||
        closeButton.contains(event.target)
      ) {
        return;
      }

      if (wrapper.classList.contains("is-expanded")) return;

      wrapper.classList.add("is-expanded");

      if (icon) {
        icon.className = "bi bi-zoom-out";
      }
    });

    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      wrapper.classList.remove("is-expanded");

      if (icon) {
        icon.className = "bi bi-zoom-in";
      }
    });

    wrapper.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();

        if (!wrapper.classList.contains("is-expanded")) {
          wrapper.click();
        }
      }

      if (
        event.key === "Escape" &&
        wrapper.classList.contains("is-expanded")
      ) {
        event.preventDefault();

        wrapper.classList.remove("is-expanded");

        if (icon) {
          icon.className = "bi bi-zoom-in";
        }
      }
    });
  });

  /* RESET 3D CARD EFFECT ON RESIZE */
  let resizeTimer = null;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      if (window.innerWidth < 768) {
        designCards.forEach((card) => {
          card.style.setProperty("--rx", "0deg");
          card.style.setProperty("--ry", "0deg");
        });
      }
    }, 150);
  }, {
    passive: true
  });

  /* CONSOLE */
  console.log(
    "%c Jay Christian Baccay ",
    [
      "background:#05070b",
      "color:#22d3ee",
      "font-weight:bold",
      "padding:8px 12px",
      "border:1px solid #22d3ee",
      "border-radius:6px"
    ].join(";")
  );

  console.log(
    "%c IT Support Specialist Portfolio ",
    [
      "color:#60a5fa",
      "font-weight:bold",
      "font-size:13px"
    ].join(";")
  );

});
