import dom from "@left4code/tw-starter/dist/js/dom";
import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { helper as $h } from "@/utils";
import { topMenu as useTopMenuStore } from "@/stores/top-menu";
import { useRecoilValue } from "recoil";
import { linkTo, nestedMenu } from "@/layouts/side-menu";
import { Lucide } from "@/base-components";
import MobileMenu from "@/components/mobile-menu/Main";
import logoUrl from "@/assets/images/white-logo.png";

function Main() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formattedMenu, setFormattedMenu] = useState([]);
  const topMenuStore = useRecoilValue(useTopMenuStore);
  const topMenu = () => nestedMenu($h.toRaw(topMenuStore.menu), location);

  useEffect(() => {
    dom("body").removeClass("error-page").removeClass("login").addClass("main");
    setFormattedMenu(topMenu());
  }, [topMenuStore, location.pathname]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <MobileMenu />
      <header style={{
        display: "flex", alignItems: "center",
        background: "#0d3347",
        padding: "0 16px", height: "auto", minHeight: "64px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        position: "sticky", top: 0, zIndex: 100, gap: "8px",
        flexWrap: "wrap",
      }}>
        {/* Logo */}
        <Link to="/top-menu/documentscontent" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", flexShrink: 0, marginRight: "8px", padding: "10px 0" }}>
          <img src={logoUrl} alt="CloudThat" style={{ height: "28px", width: "auto", objectFit: "contain", display: "block" }} />
        </Link>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, flexWrap: "wrap", padding: "6px 0" }}>
          {formattedMenu.map((menu, menuKey) => {
            const isActive = menu.active;
            return (
              <a
                key={menuKey}
                href={menu.subMenu ? "#" : menu.pathname}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 10px", borderRadius: "6px",
                  fontSize: "12px", fontWeight: "500",
                  color: isActive ? "#7ec8e3" : "rgba(255,255,255,0.65)",
                  background: isActive ? "rgba(126,200,227,0.15)" : "transparent",
                  borderBottom: isActive ? "2px solid #7ec8e3" : "2px solid transparent",
                  textDecoration: "none", cursor: "pointer",
                  transition: "all 0.15s", whiteSpace: "nowrap",
                }}
                onClick={(e) => { e.preventDefault(); linkTo(menu, navigate); }}
              >
                <Lucide icon={menu.icon} className="w-4 h-4" />
                {menu.title}
              </a>
            );
          })}
        </nav>

        {/* Guest Mode label */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "8px", padding: "6px 12px",
          margin: "6px 0",
        }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "6px",
            background: "#7ec8e3", color: "#0d3347",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", fontWeight: "700",
          }}>
            G
          </div>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#fff" }}>Guest Mode</span>
        </div>
      </header>

      <main style={{ padding: "16px", maxWidth: "1400px", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Main;
