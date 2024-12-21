#[starknet::interface]
trait ICounter<T> {
    fn get_counter(self: @T) -> u32;
    fn increase_counter(ref self: T);
    fn decrease_counter(ref self: T);
    //fn reset_counter(ref self: T);
}


#[starknet::contract]
mod Counter {
    use super::ICounter;
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        counter: u32,
    }

    #[constructor]
    fn constructor(ref self: ContractState, init_value: u32) {
        self.counter.write(init_value);
    }

    #[abi(embed_v0)]
    impl CounterImpl of ICounter<ContractState> {
        fn get_counter(self: @ContractState) -> u32 {
            self.counter.read()
        }

        fn increase_counter(ref self: ContractState){
            let old_counter = self.counter.read();
            let new_counter = self.counter.write(old_counter + 1);
        }

        fn decrease_counter_counter(ref self: ContractState){
            //let old_counter = self.counter.read();
            //let new_counter = self.counter.write(old_counter - 1);
            self.counter.write(self.counter.read() - 1);
        }
    }
}