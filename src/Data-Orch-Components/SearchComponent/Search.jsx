import React, { useState } from "react";
import { Lucide } from "@/base-components";

export default function Search({ setSearchQuery }) {
  const [value, setValue] = useState("");

  const handleChange = (e) => {
    setValue(e.target.value);
    setSearchQuery(e.target.value);
  };

  return (
    <div className="relative w-full sm:w-auto mt-3 sm:mt-0">
      <Lucide
        icon="Search"
        className="w-4 h-4 absolute my-auto inset-y-0 ml-3 left-0 z-10 text-slate-500"
      />
      <input
        type="text"
        className="form-control w-full sm:w-64 box px-10"
        placeholder="Search files"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
