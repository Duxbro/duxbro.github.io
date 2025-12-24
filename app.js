const { useState } = React;

function CanvasApp() {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("Type something...");

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
            <canvas id="canvas" width="400" height="200"></canvas>
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
