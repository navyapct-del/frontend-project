import { CloudUploadIcon, XCircleIcon } from "@heroicons/react/outline";
import React, { useRef } from "react";
import state, { useState, useEffect } from "react";
import { LoadingIcon } from "@/base-components";
import { uploadDocument } from "../../../config/AzureApi";
import { documentextention } from "../FileExtensions";
import { validateFileType } from "../../../utils/fileValidation";
import { userEmail } from "../../../utils/userEmail";
import { ProgressBar } from "../ProgressBar";
import {
  Lucide,
  Modal,
  ModalBody,
  PreviewComponent,
  Notification,
  Preview,
} from "@/base-components";

function DocumentUpload(props) {
  const [successModalPreview, setSuccessModalPreview] = useState(false);
  const [staticBackdropModalPreview, setStaticBackdropModalPreview] = useState(false);
  const [images, setImages] = useState([]);
  const [enablemultifile, setEnableMultiFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [samefilerror, setSameFileError] = useState(false);
  const [multifileindex, setMultiFileIndex] = useState();
  const [disableflag, setDisableFlag] = useState(false);
  var filepath = props?.current_Folder?.split("/") || [];
  const [inputFields, setInputfields] = useState([]);
  const [formatnotsupporteddisable, setFormatNotSupportedDisable] = useState(false);
  const [addbtnexception, setAddBtnException] = useState(false);
  const [notsupportedfiles, setNotSupportedFiles] = useState([]);
  const [fileTypeError, setFileTypeError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccessState] = useState(false);


  const hiddenFileInputRef = React.useRef(new Array());

  const handleFileClick = (event, i) => {
    hiddenFileInputRef.current[i].click();
  };

  function handleKeydown(e, i) {
    if (e.key != "Enter") return;
    const value = e.target.value;
    if (!value.trim()) return;
    inputFields[i].tags = [...inputFields[i].tags, value];
    setInputfields([...inputFields]);
    e.target.value = "";
  }

  function removeTag(index, i) {
    inputFields[i].tags.splice(index, 1);
    inputFields[i].manualtags.splice(index, 1);
    setInputfields([...inputFields]);
  }

  const getUpload = async () => {
    setDisableFlag(true);
    setFormatNotSupportedDisable(false);
    setLoading(true);
    setStaticBackdropModalPreview(true);
    setUploadProgress(0);
    setUploadSuccessState(false);

    const results = [];
    const errors  = [];

    for (const field of inputFields) {
      const file = field.selectedFile?.[0];
      if (!file) continue;

      if (!validateFileType(file)) {
        setFileTypeError("Unsupported file type. Please upload a JPG, PNG, PDF, or CSV file.");
        errors.push({ file: file.name, error: "Unsupported file type" });
        continue;
      }

      const description = field.description || "";
      const tags        = (field.tags || []).join(", ");

      console.log("[DocumentUpload] Uploading:", file.name, "| desc:", description, "| tags:", tags);

      try {
        const response = await uploadDocument(file, description, tags, (pct) => {
          setUploadProgress(pct);
        });
        console.log("[DocumentUpload] Upload success:", response);
        results.push(response);
      } catch (err) {
        console.error("[DocumentUpload] Upload failed for", file.name, ":", err);
        errors.push({ file: file.name, error: err.message });
      }
    }

    setLoading(false);

    if (errors.length > 0) {
      console.error("[DocumentUpload] Some uploads failed:", errors);
    }

    if (results.length > 0) {
      console.log("[DocumentUpload] All uploads complete. IDs:", results.map(r => r.id));
      setUploadSuccessState(true);
      setTimeout(() => {
        setUploadSuccessState(false);
        setInputfields([]);
        setImages([]);
        setUploadProgress(0);
      }, 2000);
    }
  };

  const RefreshPage = () => {
    if (typeof props.onUploadComplete === "function") {
      props.onUploadComplete();
    } else {
      window.location.reload();
    }
  };

  const handleremove = (index) => {
    setAddBtnException(true);
    setFormatNotSupportedDisable(true);
    if (multifileindex == index) setMultiFileIndex(-1);
    setImages((prev) => images.filter((data, idx) => idx != index));
    setInputfields((prev) => prev.filter((ele, indx) => index != indx));
  };

  const handleselectedchange = (index, e) => {
    if (!e || e.length === 0 || !e[0]) {
      console.error("Invalid file input:", e);
      return;
    }

    for (let i = 0; i < inputFields.length; i++) {
      if (images[i] === e[0].name) {
        setAddBtnException(false);
        setSameFileError(true);
        setFormatNotSupportedDisable(false);
        setMultiFileIndex(index);
        setInputfields((prev) => { prev[index].selectedFile = ""; return [...prev]; });
        break;
      } else {
        if (props.type == "document") {
          if (documentextention.find((st) => st === e[i].name.split(".")[1]) != null) {
            setAddBtnException(true);
            setFormatNotSupportedDisable(true);
            setMultiFileIndex(-1);
            setInputfields((prev) => { prev[index].selectedFile = e; return prev; });
            if (index < images.length) {
              let temp = [...images]; temp[index] = e[0].name; setImages(temp);
            } else {
              setImages([...images, e[0].name]);
            }
          } else {
            setFormatNotSupportedDisable(false);
            setAddBtnException(false);
            setMultiFileIndex(-1);
            setInputfields((prev) => { prev[index].selectedFile = e; return prev; });
            if (index < images.length) {
              let temp = [...images]; temp[index] = e[0].name; setImages(temp);
            } else {
              setImages([...images, e[0].name]);
            }
          }
        }
      }
    }
  };

  const handleaddclick = () => {
    setNotSupportedFiles([]);
    setAddBtnException(false);
    setFormatNotSupportedDisable(false);
    setInputfields([...inputFields, { description: "", tags: [], manualtags: [], selectedFile: "", selecfile: "" }]);
  };

  const handleinputchange = (index, e) => {
    const list = [...inputFields];
    list[index].manualtags = e;
    setInputfields(list);
  };

  const handledescriptionchange = (index, e) => {
    const list = [...inputFields];
    list[index].description = e;
    setInputfields(list);
  };

  const handleMultipleFile = (e) => {
    if (e.length > 0) {
      setDisableFlag(false);
      let file = [];
      setEnableMultiFile(true);
      for (let i = 0; i < e.length; i++) {
        if (props.type == "document") {
          if (documentextention.find((st) => st === e[i].name.split(".")[1]) != null) {
            setFormatNotSupportedDisable(true);
            setAddBtnException(true);
            file = [e[i]];
            inputFields.push({ description: "", tags: [], manualtags: [], selectedFile: file, selecfile: "" });
            images.push(e[i].name);
          } else {
            file = [e[i]];
            notsupportedfiles.push(file[0].name);
            if (formatnotsupporteddisable == false) setAddBtnException(true);
          }
        }
      }
    }
  };

  const successNotification = useRef();
  const successNotificationToggle = () => { successNotification.current.showToast(); };

  return (
    <>
      <PreviewComponent>
        {({ toggle }) => (
          <>
            <Preview>
              <div className="flex justify-center mt-5">
                <div className="flex flex-col px-5 py-5 border rounded-lg bg-white border-gray-300 w-full sm:w-3/4 lg:w-full xl:w-full intro-y border-b border-slate-200/60 dark:border-darkmode-300 h-4/5 dark:bg-darkmode-600">
                  {enablemultifile ? (
                    <>
                      {inputFields.map((x, i) => (
                        <React.Fragment key={i}>
                          <div className="grid grid-cols-12 gap-4">
                            {filepath[1] === "document" ? (
                              <div className="col-span-12 lg:col-span-4 mt-3">
                                <label htmlFor="about" className="block lg:text-lg font-medium text-base ml-1">Choose file</label>
                                <div className="border-dashed border-2 border-gray-200 my-3 py-5 px-28 sm:py-5 sm:px-5">
                                  <div className="text-sm text-gray-400 py-7 -px-2 lg:px-0 font-mono font-sm cursor-pointer hover:text-blue-700 block">
                                    <button className="btn btn-primary mr-5" onClick={(e) => { handleFileClick(e, i); }}>
                                      <Lucide icon="Upload" className="w-4 h-4 mr-2" />
                                      Choose file
                                    </button>
                                    <span>{x.selectedFile == "" ? "No file selected" : images[i]}</span>
                                    <input
                                      type="file"
                                      accept="document/*"
                                      ref={(element) => (hiddenFileInputRef.current[i] = element)}
                                      onChange={(e) => { handleselectedchange(i, e.target.files); }}
                                      style={{ display: "none" }}
                                    />
                                  </div>
                                </div>
                                {i == multifileindex ? (
                                  <div className="text-center text-red-500 text-base">File already exist... Select New file !!!</div>
                                ) : <div></div>}
                                {inputFields[i].selectedFile == "" ? <div></div> :
                                  documentextention.find((st) => st === inputFields[i].selectedFile[0].name.split(".")[1]) != null
                                    ? <div></div>
                                    : <div className="text-red-500 text-center">File format not supported !!!</div>
                                }
                              </div>
                            ) : null}

                            <div className="col-span-12 lg:col-span-4">
                              <div className="my-3">
                                <label htmlFor="about" className="block lg:text-lg font-medium text-base pb-2 ml-1">Description</label>
                                <div className="mt-1 mb-2">
                                  <textarea
                                    id="description" name="description" value={x.description} rows={5}
                                    className="form-control py-4 px-4 block"
                                    placeholder="Please Add Description ...."
                                    onChange={(e) => handledescriptionchange(i, e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="col-span-12 lg:col-span-4">
                              <label htmlFor="about" className="block lg:text-lg font-medium text-base pb-2 my-2 ml-2">Manual Tags</label>
                              <input
                                type="text" className="form-control py-3 px-4 block mb-5"
                                placeholder="Please Enter Tags ..."
                                onChange={(e) => handleinputchange(i, [...inputFields[i].tags, e.target.value])}
                                onKeyDown={(e) => handleKeydown(e, i)}
                              />
                              {inputFields[i].tags.map((tag, index) => (
                                <div className="btn btn-primary w-32 mr-1 mb-2 font-medium text-sm form-control" key={index}>
                                  <span className="text text-lg text-white text-ellipsis overflow-hidden">{tag}</span>
                                  <span className="inline-block align-middle cursor-pointer form-control whitespace-normal"
                                    onClick={() => { removeTag(index, i); }}
                                    onChange={(e) => handleinputchange(e, i)}>
                                    <div className="relative">
                                      <XCircleIcon className="h-7 w-7 text-white group-hover:text-indigo-400 mb-1 absolute -right-2 -bottom-4" />
                                    </div>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-center items-center my-4">
                            {inputFields.length !== 1 && (
                              <button className="btn btn-danger w-32 mr-2 mb-2"
                                onClick={(e) => { e.preventDefault(); handleremove(i); }}>
                                <Lucide icon="MinusSquare" className="w-4 h-4 mr-2" /> Remove
                              </button>
                            )}
                          </div>
                        </React.Fragment>
                      ))}

                      {notsupportedfiles.length > 0 && props.type == "document" && (
                        <>
                          <div className="mx-1 text-cyan-800 flex justify-center text-lg mb-2 mt-2">
                            Supported File formats :
                            <span className="text-cyan-800 mx-2">[{documentextention.map((item) => <span>.{item}, </span>)}]</span>
                          </div>
                          <div className="flex justify-center text-lg">
                            <span className="text-red-800 mx-1">The below file formats are not supported !!!</span>
                          </div>
                          <div className="flex text-red-800 justify-center mb-5 mt-2">
                            {notsupportedfiles.map((i) => <div className="text-lg"><span className="px-2">{i}</span></div>)}
                          </div>
                        </>
                      )}

                      <div className="flex justify-center items-center my-3">
                        <button className="btn bg-blue-800 text-white w-32 mr-2 mb-2"
                          onClick={(e) => { e.preventDefault(); handleaddclick(); }}
                          disabled={addbtnexception ? false : true}>
                          <Lucide icon="PlusSquare" className="w-4 h-4 mr-2" /> Add
                        </button>
                        <button className="btn btn-primary w-32 mr-2 mb-2"
                          onClick={(e) => { e.preventDefault(); images.length > 0 ? getUpload() : successNotificationToggle(); }}
                          disabled={disableflag ? false : (formatnotsupporteddisable ? false : true)}>
                          <Lucide icon="CheckSquare" className="w-4 h-4 mr-2" /> Submit
                        </button>
                      </div>
                    </>
                  ) : filepath[1] === "document" ? (
                    <div className="grid grid-cols-12 my-12">
                      <div className="col-span-2"></div>
                      <div className="rounded-xl h-full col-span-12 w-full md:w-full md:col-span-12 lg:col-span-8 lg:w-4/5 xl:col-span-8 xl:w-4/5 pt-5 mx-auto shadow-xl">
                        <div className="bg-primary py-3 mx-auto rounded-t-lg">
                          <div className="flex justify-center items-center">
                            <h1 className="text-lg text-white font-sans font-semibold">Upload document</h1>
                          </div>
                        </div>
                        <div className="dark:border-darkmode-200 border-dashed border-4 border-gray-200 rounded-lg mx-9 py-12 my-12">
                          <div className="my-5">
                            <CloudUploadIcon className="h-12 w-12 stroke-primary text-white group-hover:text-indigo-400 mx-auto" />
                            <h1 className="text-xl text-black font-sans font-normal text-center">Select files to upload</h1>
                          </div>
                          <input type="file" accept="document/*"
                            className="block form-control mx-auto bg-white my-8 w-2/6 px-3 py-1.5 text-md font-normal text-black border border-solid border-gray-300 rounded transition ease-in-out focus:text-gray-700 focus:bg-white focus:border-cyan-900 focus:outline-none cursor-pointer"
                            onChange={(e) => { handleMultipleFile(e.target.files); }} multiple />
                        </div>
                      </div>
                      <div className="col-span-2"></div>
                    </div>
                  ) : null}

                  <span>{state.uploadSuccess ? setSuccessModalPreview(true) : ""}</span>

                  {fileTypeError && (
                    <div className="text-red-600 text-center text-sm my-2 font-medium">{fileTypeError}</div>
                  )}
                  {loading && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="my-3">
                      <ProgressBar
                        percent={uploadProgress}
                        filename={inputFields[0]?.selectedFile?.[0]?.name || ""}
                        fileSize={inputFields[0]?.selectedFile?.[0]?.size || 0}
                      />
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className="text-green-600 text-center text-sm my-2 font-medium flex items-center justify-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Upload successful!
                    </div>
                  )}

                  <Modal size="modal-md" backdrop="static" show={staticBackdropModalPreview}
                    onHidden={() => { setStaticBackdropModalPreview(false); }}>
                    {loading && images.length > 0 ? (
                      <ModalBody className="p-0">
                        <div className="py-5 text-center mx-auto">
                          <div className="col-span-6 sm:col-span-3 xl:col-span-2 flex flex-col justify-end items-center my-12">
                            <LoadingIcon icon="ball-triangle" className="w-16 h-16" />
                            <div className="text-center text-lg text-bold mt-8">Loading...</div>
                          </div>
                        </div>
                      </ModalBody>
                    ) : (
                      <ModalBody className="p-0">
                        <div className="p-5 text-center">
                          <Lucide icon="CheckCircle" className="w-16 h-16 text-success mx-auto mt-3" />
                          <div className="text-slate-500 mt-2">File Uploaded Sucessfully!</div>
                        </div>
                        <div className="px-5 pb-8 text-center">
                          <button onClick={() => { setStaticBackdropModalPreview(false); setEnableMultiFile(false); RefreshPage(); }}
                            className="btn btn-primary w-24" type="button">Ok</button>
                        </div>
                      </ModalBody>
                    )}
                  </Modal>

                  <Preview>
                    <div className="text-center">
                      <Notification getRef={(el) => { successNotification.current = el; }} className="flex">
                        <Lucide icon="CheckCircle" className="text-success" />
                        <div className="ml-4 mr-4">
                          <div className="font-medium">Fill the form!</div>
                          <div className="text-slate-500 mt-1">The files will not be submitting unless they are selected correctly !!.</div>
                        </div>
                      </Notification>
                    </div>
                  </Preview>
                </div>
              </div>
            </Preview>
          </>
        )}
      </PreviewComponent>
    </>
  );
}

export default DocumentUpload;
