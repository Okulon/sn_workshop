#[starknet::interface]
pub trait ICounter<T> { //only pub for testing
    fn get_counter(self: @T) -> u32;
    fn increase_counter(ref self: T);
    fn decrease_counter(ref self: T);
    fn reset_counter(ref self: T);
}


#[starknet::contract]
pub mod Counter { //only public for testing
    use super::ICounter;
    use openzeppelin_access::ownable::OwnableComponent;
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    // Ownable Mixin
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl InternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        counter: u32,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        CounterIncreased: CounterIncreased,
        CounterDecreased: CounterDecreased,
        #[flat]
        OwnableEvent: OwnableComponent::Event
    }

    #[derive(Drop, starknet::Event)]
    pub struct CounterIncreased {
        pub counter: u32
    }

    #[derive(Drop, starknet::Event)]
    pub struct CounterDecreased {
        pub counter: u32
    }

    pub mod Errors {
        pub const NEGATIVE_COUNTER: felt252 = 'Counter can\'t be negative';
    } 

    #[constructor]
    fn constructor(ref self: ContractState, init_value: u32, owner: ContractAddress) {
        self.counter.write(init_value);
        // Set the initial owner of the contract
        self.ownable.initializer(owner);
    }

    #[abi(embed_v0)]
    impl CounterImpl of ICounter<ContractState> {
        fn get_counter(self: @ContractState) -> u32 {
            self.counter.read()
        }

        fn increase_counter(ref self: ContractState){
            let old_counter = self.counter.read();
            let new_counter = old_counter + 1;
            self.counter.write(new_counter);
            self.emit(CounterIncreased {counter: new_counter});
        }

        fn decrease_counter(ref self: ContractState){
            let old_counter = self.counter.read();
            assert(old_counter > 0, Errors::NEGATIVE_COUNTER);
            let new_counter = old_counter -1;
            self.counter.write(new_counter);
            self.emit(CounterDecreased {counter: self.counter.read()});
        }

        fn reset_counter(ref self: ContractState){
            self.ownable.assert_only_owner();
            self.counter.write(0)
        }
    }
}
//owner: 0x06fe24a4fbf70c81f0a991776fedff6171b3901282ea4f8bde90ef5eb4e529b5 (me)
// to build + deploy
// scarb build
//          starkli -h (HELP ONLY)
// starkli signer keystore new keystore.json
// starkli account oz init account.json --keystore keystore.json (Open zeppelin)
//          0x04a60673f44c38279e6de8725db4fc91bed2a6807c07eb7b7e94894bed0ccc01 (deployed at) not true idk why
// starkli account deploy account.json --keystore keystore.json
// starkli declare target/dev/sn_workshop_Counter.contract_class.json --account account.json --keystore keystore.json  --> declares classhash 0x063059e1d00c6acac3494c2224e4d54019764c5f093b66cf9772412b821109b0
// starkli deploy 0x063059e1d00c6acac3494c2224e4d54019764c5f093b66cf9772412b821109b0 --account account.json -- keystore keystore.json --> Deplyed here 0x07de06e0b46751e0361993838c4741c162dc5f7ebe50dcaf9863f94bc93573f7


//build -> declare -> deploy