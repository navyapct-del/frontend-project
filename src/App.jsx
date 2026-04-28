// import ScrollToTop from "@/base-components/scroll-to-top/Main";
// import { BrowserRouter } from "react-router-dom";
// import { RecoilRoot } from "recoil";
// import Router from "./router";

// function App() {
//   return (
//     <>
//       <RecoilRoot>
//         <BrowserRouter>
//           <Router />
//           <ScrollToTop />
//         </BrowserRouter>
//       </RecoilRoot>

//       <button
//         style={{
//           padding: "10px 20px",
//           backgroundColor: "blue",
//           color: "white",
//           border: "none",
//           borderRadius: "5px",
//           margin: "10px"
//         }}
//         onClick={() => alert("Test button working")}
//       >
//         Test Button
//       </button>
//     </>
//   );
// }
// // function App() {
// //   return (
// //     <RecoilRoot>
// //       <BrowserRouter>
// //         <Router />
// //         <ScrollToTop />
// //       </BrowserRouter>
// //     </RecoilRoot>
// //  
// //   );
// // }

// // export default App;

import ScrollToTop from "@/base-components/scroll-to-top/Main";
import { BrowserRouter } from "react-router-dom";
import { RecoilRoot } from "recoil";
import Router from "./router";

function App() {
  return (
    <>
      <RecoilRoot>
        <BrowserRouter>
          <Router />
          <ScrollToTop />
        </BrowserRouter>
      </RecoilRoot>

      <button
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          padding: "10px 20px",
          backgroundColor: "blue",
          color: "white",
          border: "none",
          borderRadius: "5px"
        }}
        onClick={() => alert("Test button working")}
      >
        Test Button
      </button>
    </>
  );
}

export default App;
