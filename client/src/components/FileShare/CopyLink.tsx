const CopyLink = () => {
    // copy current link
    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
    };

    return (
        <div>
            <button onClick={copyLink}>Copy Link</button>
        </div>
    );
};

export default CopyLink;
