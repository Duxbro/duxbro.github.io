const { useState, useEffect, useRef } = React;

function CanvasApp() {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("Type something...");
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        
        // Clear the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set font and fill style
        context.font = "30px Arial";
        context.fillStyle = "#000";
        
        // Draw output text on the canvas
        context.fillText(output, 50, 100);
    }, [output]); // Redraw whenever output changes

    const handleChange = (e) => {
        const value = e.target.value;
        setInput(value);
        if (value.toLowerCase() === "hello") {
            setOutput("world");
        } else {
            setOutput("hello");
        }
    };

    return (
        <div>
            <canvas ref={canvasRef} width="400" height="200"></canvas>
            <input 
                type="text" 
                value={input} 
                onChange={handleChange} 
                placeholder="Type here..." 
            />
            <div>{output}</div>
        </div>
    );
}

const root = document.getElementById("app");
ReactDOM.createRoot(root).render(<CanvasApp />);
