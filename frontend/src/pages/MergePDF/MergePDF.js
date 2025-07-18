import React, { useContext, useEffect, useState, useRef} from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/apiClient";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AuthContext } from "../../context/AuthContext";
import "./MergePDF.css";

const MergePDF = () => {
  const { isAuthenticated, isAdmin } = useContext(AuthContext);
    const [pdfFiles, setPdfFiles] = useState([]);
    const fileInputRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Merge PDFs";
    if (!isAuthenticated || !isAdmin) navigate("/");
  }, [isAuthenticated, isAdmin, navigate]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
      setPdfFiles((prev) => [...prev, ...selectedFiles]);
      

  };

  const removeFile = (index) => {
    const newFiles = [...pdfFiles];
    newFiles.splice(index, 1);
      setPdfFiles(newFiles);
      
      if (newFiles.length === 0 && fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = Array.from(pdfFiles);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setPdfFiles(reordered);
  };

  const submitDocuments = async (e) => {
    e.preventDefault();
    const data = new FormData();
    pdfFiles.forEach((file, idx) => data.append(`file${idx}`, file));

    const res = await apiFetch("/mergePDF", {
      method: "POST",
      body: data,
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      a.remove();
    } else {
      alert("Merge failed");
    }
  };

  return (
    <form className="mergePDF-form" onSubmit={submitDocuments}>
      <div className="file-upload">
        <label>Select PDFs (drag to reorder)</label>
        <input
                  type="file"
                  ref={fileInputRef}
          accept="application/pdf"
          multiple
          onChange={handleFileSelect}
        />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="pdf-list">
          {(provided) => (
            <div
              className="file-list"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {pdfFiles.map((file, index) => (
                <Draggable key={file.name + index} draggableId={file.name + index} index={index}>
                  {(provided) => (
                    <div
                      className="file-preview"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <span>{file.name}</span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeFile(index)}
                      >
                        ❌
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button type="submit" disabled={pdfFiles.length < 2}>
        Merge PDFs
      </button>
    </form>
  );
};

export default MergePDF;