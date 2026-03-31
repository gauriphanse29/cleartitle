contract PropertyLedger {

    struct Property {
        uint256 id;
        string apartmentNo;
        string societyName;
        string city;
        address owner;
        uint256 registeredAt;
    }

    struct Transfer {
        address from;
        address to;
        uint256 at;
    }

    struct Document {
        string name;
        string ipfsHash;
        uint256 uploadedAt;
    }

    uint256 public count = 0;
    mapping(uint256 => Property) public properties;
    mapping(uint256 => Transfer[]) public history;
    mapping(uint256 => Document[]) public documents;
    mapping(address => uint256[]) public myProperties;

    event Registered(uint256 id, address owner);
    event Transferred(uint256 id, address from, address to);
    event DocumentAdded(uint256 propertyId, string name, string ipfsHash);

    function register(
        string memory _apt,
        string memory _society,
        string memory _city
    ) public {
        count++;
        properties[count] = Property(
            count, _apt, _society, _city, msg.sender, block.timestamp
        );
        myProperties[msg.sender].push(count);
        emit Registered(count, msg.sender);
    }

    function transfer(uint256 _id, address _to) public {
        require(properties[_id].owner == msg.sender, "Not the owner");
        require(_to != address(0), "Invalid address");
        address prev = properties[_id].owner;
        properties[_id].owner = _to;
        history[_id].push(Transfer(prev, _to, block.timestamp));
        myProperties[_to].push(_id);
        emit Transferred(_id, prev, _to);
    }

    function addDocument(
        uint256 _propertyId,
        string memory _name,
        string memory _ipfsHash
    ) public {
        require(
            properties[_propertyId].owner == msg.sender,
            "Not the owner"
        );
        documents[_propertyId].push(
            Document(_name, _ipfsHash, block.timestamp)
        );
        emit DocumentAdded(_propertyId, _name, _ipfsHash);
    }

    function getHistory(uint256 _id)
        public view returns (Transfer[] memory) {
        return history[_id];
    }

    function getMyProperties(address _addr)
        public view returns (uint256[] memory) {
        return myProperties[_addr];
    }

    function getDocuments(uint256 _propertyId)
        public view returns (Document[] memory) {
        return documents[_propertyId];
    }
}