export async function generateDVF(): Promise<string> {
  try {
    console.log('DVF: Extracting DOM structure...');
    const domStructure = extractDOMStructure();

    console.log('DVF: Extracting CSS signature...');
    const cssSignature = extractCSSSignature();

    console.log('DVF: Extracting route info...');
    const routeInfo = extractRouteInfo();

    const combined = {
      dom: domStructure,
      css: cssSignature,
      routes: routeInfo,
    };

    console.log('DVF: Creating hash from combined data...');
    const normalized = JSON.stringify(combined, null, 0);
    const hash = await hashString(normalized);
    console.log('DVF: Generated hash:', hash);
    return hash;
  } catch (error) {
    console.error('DVF: Failed to generate DVF:', error);
    throw error;
  }
}

function extractDOMStructure(): any {
  const maxDepth = 10;

  function serializeElement(element: Element, depth: number): any {
    if (depth > maxDepth) return null;

    const result: any = {
      tag: element.tagName.toLowerCase(),
    };

    // Include stable attributes
    const stableAttrs = ['id', 'class', 'data-testid', 'role', 'type'];
    stableAttrs.forEach(attr => {
      if (element.hasAttribute(attr)) {
        result[attr] = element.getAttribute(attr);
      }
    });

    // Include children structure (not content)
    const children = Array.from(element.children)
      .map(child => serializeElement(child, depth + 1))
      .filter(child => child !== null);

    if (children.length > 0) {
      result.children = children;
    }

    return result;
  }

  return serializeElement(document.documentElement, 0);
}

function extractCSSSignature(): any {
  const cssInfo: any = {
    stylesheets: [],
    inlineStyles: 0,
  };

  // Extract stylesheet info
  Array.from(document.styleSheets).forEach(sheet => {
    try {
      if (sheet.href) {
        cssInfo.stylesheets.push({
          href: sheet.href,
          rules: sheet.cssRules ? sheet.cssRules.length : 0,
        });
      } else {
        cssInfo.stylesheets.push({
          inline: true,
          rules: sheet.cssRules ? sheet.cssRules.length : 0,
        });
      }
    } catch (e) {
      // Cross-origin stylesheets
      if (sheet.href) {
        cssInfo.stylesheets.push({ href: sheet.href, crossOrigin: true });
      }
    }
  });

  // Count inline styles
  cssInfo.inlineStyles = document.querySelectorAll('[style]').length;

  return cssInfo;
}

function extractRouteInfo(): any {
  return {
    pathname: window.location.pathname,
    origin: window.location.origin,
    // Could expand this to include route patterns if using a router
  };
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}