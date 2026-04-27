import { useRoutes, Navigate } from "react-router-dom";
import TopMenu from "../layouts/top-menu/Main";
import ContentManager from "../Pages/ContentManager";
import InformationSage from "../Pages/InformationSage";
import SingleFileSathi from "../Pages/SingleFileSathi";
import SharedChat from "../Pages/SharedChat";

function Router() {
  const routes = [
    { path: "/", element: <Navigate to="/top-menu/documentscontent" replace /> },
    { path: "/login", element: <Navigate to="/top-menu/documentscontent" replace /> },
    { path: "/register", element: <Navigate to="/top-menu/documentscontent" replace /> },
    { path: "/forgetpassword", element: <Navigate to="/top-menu/documentscontent" replace /> },
    { path: "/chat/:sessionId", element: <SharedChat /> },
    {
      path: "/top-menu",
      element: <TopMenu />,
      children: [
        { path: "filemanager",      element: <ContentManager type="file" /> },
        { path: "imagescontent",    element: <ContentManager type="image" /> },
        { path: "videoscontent",    element: <ContentManager type="video" /> },
        { path: "documentscontent", element: <ContentManager type="document" /> },
        { path: "mediacontent",     element: <ContentManager type="media" /> },
        { path: "singlefile",       element: <SingleFileSathi /> },
        { path: "informationsage",  element: <InformationSage /> },
      ],
    },
  ];
  return useRoutes(routes);
}

export default Router;
